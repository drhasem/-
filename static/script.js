// Global variable to hold the parsed data
let parsedData = null;

function showNotification(message, type) {
    const notificationsDiv = document.getElementById('notifications');
    notificationsDiv.textContent = message;
    notificationsDiv.className = `notifications ${type}`;
    notificationsDiv.style.display = 'block';

    // Hide the notification after 5 seconds
    setTimeout(() => {
        notificationsDiv.style.display = 'none';
    }, 5000);
}

// Add event listener for file upload
const fileUpload = document.getElementById('file-upload');

fileUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === 'csv') {
        // Use PapaParse to parse the CSV file
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            complete: function(results) {
                parsedData = results.data;
                showNotification('تم تحميل ومعالجة ملف CSV بنجاح!', 'success');
            },
            error: function(error) {
                showNotification('حدث خطأ أثناء معالجة ملف CSV.', 'error');
            }
        });
    } else if (fileExtension === 'xls' || fileExtension === 'xlsx') {
        // Use SheetJS to parse the Excel file
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            parsedData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
            // Convert array of arrays to array of objects
            const headers = parsedData.shift();
            parsedData = parsedData.map(row => {
                let obj = {};
                headers.forEach((header, i) => {
                    obj[header] = row[i];
                });
                return obj;
            });
            showNotification('تم تحميل ومعالجة ملف Excel بنجاح!', 'success');
        };
        reader.onerror = function() {
            showNotification('حدث خطأ أثناء قراءة ملف Excel.', 'error');
        };
        reader.readAsArrayBuffer(file);
    } else {
        showNotification('نوع الملف غير مدعوم. يرجى تحميل ملف CSV أو Excel.', 'error');
    }
});

// Placeholder functions for statistical analysis
// These will be implemented later to perform the actual calculations.

function calculateDescriptiveStats() {
    if (!parsedData || parsedData.length === 0) {
        showNotification('يرجى تحميل ملف بيانات أولاً.', 'error');
        return;
    }

    const resultsDiv = document.getElementById('descriptive-stats-results');
    resultsDiv.innerHTML = ''; // Clear previous results

    const h3 = document.createElement('h3');
    h3.textContent = 'نتائج الإحصاءات الوصفية:';
    resultsDiv.appendChild(h3);

    const table = document.createElement('table');
    table.border = '1';
    const thead = table.createTHead();
    const tbody = table.createTBody();
    const headerRow = thead.insertRow();
    ['المتغير', 'المتوسط', 'الانحراف المعياري', 'الالتواء', 'التفلطح'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });

    const headers = Object.keys(parsedData[0]);
    headers.forEach(header => {
        const columnData = parsedData.map(row => row[header]).filter(val => typeof val === 'number' && !isNaN(val));

        if (columnData.length > 0) {
            const row = tbody.insertRow();
            const cellHeader = row.insertCell();
            cellHeader.textContent = header; // Safely setting header text

            row.insertCell().textContent = ss.mean(columnData).toFixed(3);
            row.insertCell().textContent = ss.standardDeviation(columnData).toFixed(3);
            row.insertCell().textContent = ss.sampleSkewness(columnData).toFixed(3);
            row.insertCell().textContent = ss.sampleKurtosis(columnData).toFixed(3);
        }
    });

    resultsDiv.appendChild(table);
}

function groupDataByVariable(variables, groupVariable) {
    const groups = {};
    parsedData.forEach(row => {
        const groupValue = row[groupVariable];
        if (groupValue === undefined || groupValue === null) return;
        if (!groups[groupValue]) {
            groups[groupValue] = {};
        }
        variables.forEach(v => {
            if (!groups[groupValue][v]) {
                groups[groupValue][v] = [];
            }
            const value = row[v];
            if (typeof value === 'number' && !isNaN(value)) {
                groups[groupValue][v].push(value);
            }
        });
    });
    return groups;
}

function compareGroups() {
    if (!parsedData) {
        showNotification('يرجى تحميل ملف بيانات أولاً.', 'error');
        return;
    }

    const variablesText = document.getElementById('group-comparison-vars').value.trim();
    const groupVariable = document.getElementById('group-comparison-group').value.trim();
    if (!variablesText || !groupVariable) {
        showNotification('يرجى إدخال المتغيرات ومتغير المجموعة.', 'error');
        return;
    }

    const variables = variablesText.split('\n').map(v => v.trim());
    const resultsDiv = document.getElementById('group-comparison-results');
    resultsDiv.innerHTML = ''; // Clear previous results

    const h3 = document.createElement('h3');
    h3.textContent = 'نتائج مقارنة المجموعات:';
    resultsDiv.appendChild(h3);

    const groups = groupDataByVariable(variables, groupVariable);
    const groupKeys = Object.keys(groups);

    if (groupKeys.length < 2) {
        const p = document.createElement('p');
        p.textContent = 'تحتاج إلى مجموعتين على الأقل للمقارنة.';
        resultsDiv.appendChild(p);
        return;
    }

    // Perform t-test for 2 groups, ANOVA for >2 groups
    variables.forEach(v => {
        const h4 = document.createElement('h4');
        h4.textContent = `المتغير: ${v}`;
        resultsDiv.appendChild(h4);

        const groupData = groupKeys.map(k => groups[k][v].filter(val => val !== undefined));

        const p = document.createElement('p');
        if (groupKeys.length === 2) {
            const tStat = ss.tTestTwoSample(groupData[0], groupData[1]);
            const pValue = jStat.ttest(tStat, groupData[0].length + groupData[1].length - 2, 2);
            p.textContent = `t-test: t = ${tStat.toFixed(3)}, p = ${pValue.toFixed(3)}`;
        } else {
            const fStat = ss.anova(groupData);
            const pValue = jStat.ftest(fStat, groupKeys.length - 1, parsedData.length - groupKeys.length);
            p.textContent = `ANOVA: F = ${fStat.toFixed(3)}, p = ${pValue.toFixed(3)}`;
        }
        resultsDiv.appendChild(p);
    });
}

function calculateCorrelation() {
    if (!parsedData) {
        showNotification('يرجى تحميل ملف بيانات أولاً.', 'error');
        return;
    }

    const variablesText = document.getElementById('correlation-vars').value.trim();
    if (!variablesText) {
        showNotification('يرجى إدخال المتغيرات.', 'error');
        return;
    }

    const variables = variablesText.split('\n').map(v => v.trim());
    if (variables.length < 2) {
        showNotification('تحتاج إلى متغيرين على الأقل لحساب الارتباط.', 'error');
        return;
    }

    const resultsDiv = document.getElementById('correlation-results');
    resultsDiv.innerHTML = ''; // Clear previous results

    const h3 = document.createElement('h3');
    h3.textContent = 'نتائج تحليل الارتباط:';
    resultsDiv.appendChild(h3);

    const table = document.createElement('table');
    table.border = '1';
    const thead = table.createTHead();
    const tbody = table.createTBody();
    const headerRow = thead.insertRow();
    ['المتغيران', 'ارتباط بيرسون', 'p-value (Pearson)', 'ارتباط سبيرمان', 'p-value (Spearman)'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });

    for (let i = 0; i < variables.length; i++) {
        for (let j = i + 1; j < variables.length; j++) {
            const var1 = variables[i];
            const var2 = variables[j];
            const data1 = parsedData.map(row => row[var1]).filter(v => typeof v === 'number' && !isNaN(v));
            const data2 = parsedData.map(row => row[var2]).filter(v => typeof v === 'number' && !isNaN(v));

            const row = tbody.insertRow();
            const cellVars = row.insertCell();
            cellVars.textContent = `${var1} و ${var2}`;

            if (data1.length !== data2.length || data1.length < 3) {
                const cellError = row.insertCell();
                cellError.colSpan = 4;
                cellError.textContent = 'لا يمكن حساب الارتباط بسبب البيانات المفقودة أو غير الكافية.';
                continue;
            }

            const n = data1.length;

            // Pearson
            const pearson = ss.sampleCorrelation(data1, data2);
            let pValuePearson;
            if (Math.abs(pearson) === 1) {
                pValuePearson = 0;
            } else {
                const tPearson = pearson * Math.sqrt((n - 2) / (1 - pearson * pearson));
                pValuePearson = jStat.ttest(tPearson, n - 2, 2);
            }

            // Spearman
            const spearman = ss.spearmanRankCorrelation(data1, data2);
            let pValueSpearman;
            if (Math.abs(spearman) === 1) {
                pValueSpearman = 0;
            } else {
                const tSpearman = spearman * Math.sqrt((n - 2) / (1 - spearman * spearman));
                pValueSpearman = jStat.ttest(tSpearman, n - 2, 2);
            }

            row.insertCell().textContent = pearson.toFixed(3);
            row.insertCell().textContent = pValuePearson.toFixed(3);
            row.insertCell().textContent = spearman.toFixed(3);
            row.insertCell().textContent = pValueSpearman.toFixed(3);
        }
    }
    resultsDiv.appendChild(table);
}

async function performRegression() {
    if (!parsedData) {
        showNotification('يرجى تحميل ملف بيانات أولاً.', 'error');
        return;
    }

    const independentVarsText = document.getElementById('independent-vars').value.trim();
    const dependentVar = document.getElementById('dependent-var').value.trim();

    if (!independentVarsText || !dependentVar) {
        showNotification('يرجى إدخال المتغيرات المستقلة والمتغير التابع.', 'error');
        return;
    }

    const independentVars = independentVarsText.split('\n').map(v => v.trim());
    const resultsDiv = document.getElementById('regression-results');
    resultsDiv.innerHTML = ''; // Clear previous results

    const h3 = document.createElement('h3');
    h3.textContent = 'نتائج تحليل الانحدار:';
    resultsDiv.appendChild(h3);

    // Show loading indicator
    const loadingP = document.createElement('p');
    loadingP.textContent = 'جاري حساب تحليل الانحدار...';
    resultsDiv.appendChild(loadingP);

    try {
        const response = await fetch('/api/regression', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data: parsedData,
                independent_vars: independentVars,
                dependent_var: dependentVar,
            }),
        });

        resultsDiv.removeChild(loadingP); // Remove loading indicator

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'حدث خطأ في الشبكة');
        }

        const results = await response.json();

        // Display summary stats
        const summaryP = document.createElement('p');
        summaryP.textContent = `R-squared: ${results.summary.rsquared.toFixed(4)}, Adjusted R-squared: ${results.summary.rsquared_adj.toFixed(4)}`;
        resultsDiv.appendChild(summaryP);

        // Display coefficients table
        const table = document.createElement('table');
        table.border = '1';
        const thead = table.createTHead();
        const tbody = table.createTBody();
        const headerRow = thead.insertRow();
        ['المتغير', 'المعامل', 'الخطأ المعياري', 't-value', 'P>|t|'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });

        results.coefficients.forEach(coeff => {
            const row = tbody.insertRow();
            row.insertCell().textContent = coeff.variable;
            row.insertCell().textContent = coeff.coefficient.toFixed(4);
            row.insertCell().textContent = coeff.std_err.toFixed(4);
            row.insertCell().textContent = coeff.t_value.toFixed(3);
            row.insertCell().textContent = coeff.p_value.toFixed(3);
        });

        resultsDiv.appendChild(table);

    } catch (error) {
        resultsDiv.removeChild(loadingP);
        showNotification(`فشل تحليل الانحدار: ${error.message}`, 'error');
        const errorP = document.createElement('p');
        errorP.textContent = `فشل تحليل الانحدار: ${error.message}`;
        resultsDiv.appendChild(errorP);
    }
}

async function performFactorAnalysis() {
    if (!parsedData) {
        showNotification('يرجى تحميل ملف بيانات أولاً.', 'error');
        return;
    }

    const variablesText = document.getElementById('factor-analysis-vars').value.trim();
    if (!variablesText) {
        showNotification('يرجى إدخال المتغيرات للتحليل العاملي.', 'error');
        return;
    }

    const variables = variablesText.split('\n').map(v => v.trim());
    const resultsDiv = document.getElementById('factor-analysis-results');
    resultsDiv.innerHTML = ''; // Clear previous results

    const h3 = document.createElement('h3');
    h3.textContent = 'نتائج التحليل العاملي:';
    resultsDiv.appendChild(h3);

    const loadingP = document.createElement('p');
    loadingP.textContent = 'جاري حساب التحليل العاملي...';
    resultsDiv.appendChild(loadingP);

    try {
        const response = await fetch('/api/factor-analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data: parsedData,
                variables: variables,
            }),
        });

        resultsDiv.removeChild(loadingP);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'حدث خطأ في الشبكة');
        }

        const results = await response.json();

        // Display KMO and Bartlett's Test
        const adequacyP = document.createElement('p');
        adequacyP.innerHTML = `<strong>اختبار كفاية العينة:</strong><br>
                               KMO: ${results.kmo.toFixed(4)}<br>
                               <strong>اختبار بارتليت الكروي:</strong><br>
                               Chi-squared: ${results.bartlett.chi_squared.toFixed(4)}, p-value: ${results.bartlett.p_value.toExponential(4)}`;
        resultsDiv.appendChild(adequacyP);

        // Display Eigenvalues and Variance Explained
        const varianceH4 = document.createElement('h4');
        varianceH4.textContent = 'التباين المفسر (Eigenvalues):';
        resultsDiv.appendChild(varianceH4);
        const varianceTable = document.createElement('table');
        varianceTable.border = '1';
        const vThead = varianceTable.createTHead();
        const vTbody = varianceTable.createTBody();
        const vHeaderRow = vThead.insertRow();
        ['العامل', 'Eigenvalue', 'التباين (%)', 'التباين التراكمي (%)'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            vHeaderRow.appendChild(th);
        });
        results.eigenvalues.forEach((eig, i) => {
            const row = vTbody.insertRow();
            row.insertCell().textContent = `Factor ${i + 1}`;
            row.insertCell().textContent = eig.eigenvalue.toFixed(4);
            row.insertCell().textContent = eig.variance_percent.toFixed(4);
            row.insertCell().textContent = eig.cumulative_variance_percent.toFixed(4);
        });
        resultsDiv.appendChild(varianceTable);

        // Display Factor Loadings
        const loadingsH4 = document.createElement('h4');
        loadingsH4.textContent = 'تشبعات العوامل (Factor Loadings):';
        resultsDiv.appendChild(loadingsH4);
        const loadingsTable = document.createElement('table');
        loadingsTable.border = '1';
        const lThead = loadingsTable.createTHead();
        const lTbody = loadingsTable.createTBody();
        const lHeaderRow = lThead.insertRow();
        const factorHeaders = results.loadings[0] ? Object.keys(results.loadings[0]).filter(k => k !== 'variable') : [];
        ['المتغير', ...factorHeaders].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            lHeaderRow.appendChild(th);
        });
        results.loadings.forEach(loading => {
            const row = lTbody.insertRow();
            row.insertCell().textContent = loading.variable;
            factorHeaders.forEach(fh => {
                row.insertCell().textContent = loading[fh].toFixed(4);
            });
        });
        resultsDiv.appendChild(loadingsTable);

    } catch (error) {
        resultsDiv.removeChild(loadingP);
        showNotification(`فشل التحليل العاملي: ${error.message}`, 'error');
        const errorP = document.createElement('p');
        errorP.textContent = `فشل التحليل العاملي: ${error.message}`;
        resultsDiv.appendChild(errorP);
    }
}

function performNonParametricTests() {
    if (!parsedData) {
        showNotification('يرجى تحميل ملف بيانات أولاً.', 'error');
        return;
    }

    const variablesText = document.getElementById('non-parametric-vars').value.trim();
    const groupVariable = document.getElementById('non-parametric-group').value.trim();
    if (!variablesText || !groupVariable) {
        showNotification('يرجى إدخال المتغيرات ومتغير المجموعة.', 'error');
        return;
    }

    const variables = variablesText.split('\n').map(v => v.trim());
    const resultsDiv = document.getElementById('non-parametric-results');
    resultsDiv.innerHTML = ''; // Clear previous results

    const h3 = document.createElement('h3');
    h3.textContent = 'نتائج الاختبارات اللابارامترية:';
    resultsDiv.appendChild(h3);

    const groups = groupDataByVariable(variables, groupVariable);
    const groupKeys = Object.keys(groups);

    if (groupKeys.length !== 2) {
        const p = document.createElement('p');
        p.textContent = 'هذا التنفيذ يدعم حاليًا اختبار Mann-Whitney U لمجموعتين فقط.';
        resultsDiv.appendChild(p);
        return;
    }

    // Perform Mann-Whitney U test for each variable
    variables.forEach(v => {
        const h4 = document.createElement('h4');
        h4.textContent = `المتغير: ${v}`;
        resultsDiv.appendChild(h4);

        const group1Data = groups[groupKeys[0]][v].filter(val => val !== undefined);
        const group2Data = groups[groupKeys[1]][v].filter(val => val !== undefined);

        const p = document.createElement('p');
        if (group1Data.length > 0 && group2Data.length > 0) {
            const n1 = group1Data.length;
            const n2 = group2Data.length;
            const uTest = ss.mannWhitneyU(group1Data, group2Data);
            const u = uTest.U;

            // For larger samples, U is approximately normally distributed
            const meanU = (n1 * n2) / 2;
            const stdDevU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
            const z = (u - meanU) / stdDevU;
            const pValue = 2 * (1 - jStat.normal.cdf(Math.abs(z), 0, 1));

            p.textContent = `Mann-Whitney U test: U = ${u.toFixed(3)}, p ≈ ${pValue.toFixed(3)}`;
        } else {
            p.textContent = 'لا توجد بيانات كافية لإجراء الاختبار.';
        }
        resultsDiv.appendChild(p);
    });
}
