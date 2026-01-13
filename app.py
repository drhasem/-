import traceback
import numpy as np
import pandas as pd
import statsmodels.api as sm
from factor_analyzer import FactorAnalyzer
from factor_analyzer.factor_analyzer import calculate_bartlett_sphericity, calculate_kmo
from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder='.')

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/api/regression', methods=['POST'])
def regression():
    try:
        payload = request.get_json()
        data = payload.get('data')
        independent_vars = payload.get('independent_vars')
        dependent_var = payload.get('dependent_var')

        if not all([data, independent_vars, dependent_var]):
            return jsonify({'error': 'البيانات أو المتغيرات مفقودة'}), 400

        df = pd.DataFrame(data)

        # Data cleaning: Ensure numeric types and handle missing values
        for col in independent_vars + [dependent_var]:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        df.dropna(subset=independent_vars + [dependent_var], inplace=True)

        if df.shape[0] < len(independent_vars) + 2:
             return jsonify({'error': 'لا توجد بيانات كافية بعد إزالة القيم المفقودة'}), 400


        X = df[independent_vars]
        y = df[dependent_var]
        X = sm.add_constant(X) # Add a constant (intercept)

        model = sm.OLS(y, X).fit()

        # Prepare summary
        summary = {
            'rsquared': model.rsquared,
            'rsquared_adj': model.rsquared_adj,
        }

        # Prepare coefficients
        coefficients = []
        for var in model.pvalues.keys():
            coefficients.append({
                'variable': var,
                'coefficient': model.params[var],
                'std_err': model.bse[var],
                't_value': model.tvalues[var],
                'p_value': model.pvalues[var],
            })

        return jsonify({'summary': summary, 'coefficients': coefficients})

    except Exception as e:
        # Log the error for debugging
        print(f"Error during regression analysis: {e}")
        return jsonify({'error': f'حدث خطأ داخلي: {str(e)}'}), 500

@app.route('/api/factor-analysis', methods=['POST'])
def factor_analysis():
    try:
        payload = request.get_json()
        data = payload.get('data')
        variables = payload.get('variables')

        if not data or not variables:
            return jsonify({'error': 'البيانات أو المتغيرات مفقودة'}), 400

        df = pd.DataFrame(data)

        # Data cleaning
        df_selected = df[variables].apply(pd.to_numeric, errors='coerce')
        df_selected.dropna(inplace=True)

        if df_selected.shape[0] < df_selected.shape[1] + 1:
            return jsonify({'error': 'لا توجد بيانات كافية بعد إزالة القيم المفقودة'}), 400

        # 1. Adequacy Test (KMO and Bartlett)
        kmo_all, kmo_model = calculate_kmo(df_selected)
        chi_square_value, p_value = calculate_bartlett_sphericity(df_selected)

        # 2. Eigenvalues and Variance Explained
        fa = FactorAnalyzer(rotation=None, n_factors=df_selected.shape[1])
        fa.fit(df_selected)
        ev, v = fa.get_eigenvalues()

        total_variance = np.sum(ev)
        variance_percent = (ev / total_variance) * 100
        cumulative_variance_percent = np.cumsum(variance_percent)

        eigenvalues_data = []
        for i in range(len(ev)):
            eigenvalues_data.append({
                'eigenvalue': ev[i],
                'variance_percent': variance_percent[i],
                'cumulative_variance_percent': cumulative_variance_percent[i]
            })

        # 3. Factor Loadings (using number of factors with eigenvalue > 1)
        n_factors = sum(1 for i in ev if i > 1)
        if n_factors == 0:
            n_factors = 1 # At least one factor

        fa = FactorAnalyzer(rotation="varimax", n_factors=n_factors)
        fa.fit(df_selected)
        loadings = fa.loadings_

        loadings_data = []
        for i, var in enumerate(variables):
            row = {'variable': var}
            for j in range(n_factors):
                row[f'Factor {j+1}'] = loadings[i, j]
            loadings_data.append(row)


        return jsonify({
            'kmo': kmo_model,
            'bartlett': {'chi_squared': chi_square_value, 'p_value': p_value},
            'eigenvalues': eigenvalues_data,
            'loadings': loadings_data
        })

    except Exception as e:
        print("An error occurred during factor analysis:")
        traceback.print_exc()
        return jsonify({'error': f'حدث خطأ داخلي: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
