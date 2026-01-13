# منصة التحليل الإحصائي المتقدم

هذا هو تطبيق ويب لإجراء تحليلات إحصائية متقدمة، تم تطويره بواسطة الدكتور حاسم أحمد الجزار.

## نظرة عامة على البنية

يستخدم هذا التطبيق بنية العميل-الخادم:
- **الواجهة الأمامية (Frontend):** واجهة مستخدم ثابتة مبنية باستخدام HTML و CSS و JavaScript. توجد جميع ملفات الواجهة الأمامية في دليل `static/`.
- **الواجهة الخلفية (Backend):** واجهة برمجة تطبيقات (API) مبنية باستخدام Flask (Python) تقوم بجميع الحسابات الإحصائية. يوجد كود الواجهة الخلفية في `app.py`.

## الإعداد المحلي

1.  **المتطلبات الأساسية:**
    *   Python 3.8+
    *   `pip` (مدير حزم Python)

2.  **تثبيت التبعيات:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **تشغيل الخادم:**
    ```bash
    python app.py
    ```
    سيقوم هذا الأمر بتشغيل خادم تطوير محلي. يمكنك الوصول إلى التطبيق على `http://127.0.0.1:5001`.

## كيفية النشر

**مهم:** لا يمكن نشر هذا التطبيق على أنه موقع ثابت. يتطلب بيئة يمكنها تشغيل خادم ويب Python (WSGI). إليك دليل عام:

1.  **اختر مزود استضافة:**
    *   اختر منصة تدعم تطبيقات Python، مثل:
        *   **منصة كخدمة (PaaS):** Heroku, Vercel (مع تكوين الخادم), Render
        *   **خوادم افتراضية خاصة (VPS):** DigitalOcean, Linode

2.  **تكوين النشر:**
    *   **ملف `Procfile` (لـ Heroku):** قد تحتاج إلى إنشاء ملف `Procfile` لإخبار المضيف بكيفية تشغيل التطبيق.
        ```
        web: gunicorn app:app
        ```
        (ستحتاج إلى إضافة `gunicorn` إلى `requirements.txt`)
    *   **متغيرات البيئة:** تأكد من أن أي متغيرات بيئة مطلوبة تم تكوينها في بيئة النشر الخاصة بك.
    *   **أمر البناء:** قد يحتاج المضيف الخاص بك إلى أمر بناء لتثبيت التبعيات: `pip install -r requirements.txt`.
    *   **أمر البدء:** يجب أن يكون أمر البدء هو الأمر الذي يقوم بتشغيل خادم WSGI الخاص بك: `gunicorn app:app`.

3.  **النشر:**
    *   اتبع الوثائق الخاصة بمنصة الاستضافة التي اخترتها لنشر تطبيق Python/Flask.

## النشر على Tencent Cloud (دليل CVM)

هذا الدليل مخصص لنشر التطبيق باستخدام Tencent Cloud Virtual Machine (CVM) مع Ubuntu Server.

### الخطوة 1: إعداد CVM

1.  **إنشاء مثيل CVM:**
    *   انتقل إلى وحدة تحكم Tencent Cloud وقم بإنشاء مثيل CVM جديد.
    *   اختر **Ubuntu Server** كصورة نظام التشغيل.
    *   تأكد من تكوين مجموعة الأمان الخاصة بك للسماح بحركة المرور الواردة على المنفذ `80` (HTTP).
2.  **الاتصال بـ CVM الخاص بك:**
    *   استخدم SSH للاتصال بالمثيل الخاص بك باستخدام عنوان IP العام وبيانات الاعتماد الخاصة بك.
        ```bash
        ssh ubuntu@YOUR_SERVER_IP
        ```

### الخطوة 2: إعداد الخادم

1.  **تحديث الحزم:**
    ```bash
    sudo apt update && sudo apt upgrade -y
    ```
2.  **تثبيت Python و Nginx:**
    ```bash
    sudo apt install python3-pip python3-dev nginx -y
    ```

### الخطوة 3: نشر التطبيق

1.  **نسخ المستودع:**
    ```bash
    git clone <your-repository-url>
    cd <your-repository-directory>
    ```
2.  **تثبيت التبعيات:**
    ```bash
    pip3 install -r requirements.txt
    ```
    *(ملاحظة: تأكد من أن `gunicorn` موجود في `requirements.txt`)*

### الخطوة 4: تشغيل التطبيق باستخدام Gunicorn

1.  **اختبار Gunicorn:**
    *   من دليل المشروع الخاص بك، قم بتشغيل Gunicorn لخدمة التطبيق.
        ```bash
        gunicorn --bind 0.0.0.0:8000 wsgi:app
        ```
    *   يجب أن يكون التطبيق يعمل الآن على المنفذ `8000`. يمكنك إيقاف Gunicorn باستخدام `CTRL+C`.

2.  **إنشاء خدمة `systemd` (للتشغيل في الخلفية):**
    *   أنشئ ملف خدمة `systemd` جديد:
        ```bash
        sudo nano /etc/systemd/system/statistics-app.service
        ```
    *   أضف التكوين التالي، مع التأكد من تحديث المسارات إلى دليل المشروع الخاص بك:
        ```
        [Unit]
        Description=Gunicorn instance to serve the statistics app
        After=network.target

        [Service]
        User=ubuntu
        Group=www-data
        WorkingDirectory=/home/ubuntu/<your-repository-directory>
        ExecStart=/home/ubuntu/.local/bin/gunicorn --workers 3 --bind unix:statistics-app.sock -m 007 wsgi:app

        [Install]
        WantedBy=multi-user.target
        ```
    *   ابدأ الخدمة وقم بتمكينها:
        ```bash
        sudo systemctl start statistics-app
        sudo systemctl enable statistics-app
        ```

### الخطوة 5: تكوين Nginx كوكيل عكسي

1.  **إنشاء ملف تكوين Nginx جديد:**
    ```bash
    sudo nano /etc/nginx/sites-available/statistics-app
    ```
2.  **إضافة تكوين الوكيل العكسي:**
    *   استخدم محتوى ملف `nginx.conf` من هذا المستودع، مع استبدال `YOUR_SERVER_IP` بعنوان IP العام لخادمك.
        ```nginx
        server {
            listen 80;
            server_name YOUR_SERVER_IP;

            location / {
                proxy_pass http://unix:/home/ubuntu/<your-repository-directory>/statistics-app.sock;
                include proxy_params;
                proxy_redirect off;
            }
        }
        ```
3.  **تمكين الموقع:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/statistics-app /etc/nginx/sites-enabled
    sudo nginx -t # Test for syntax errors
    sudo systemctl restart nginx
    ```

الآن، يجب أن يكون تطبيقك متاحًا للجميع على عنوان IP العام لخادمك.

## نبذة عن المنصة

هذه المنصة من إعداد الدكتور حاسم أحمد الجزار. أرجو من يستخدم هذه المنصة الدعاء لوالدتي بالرحمة والمغفرة.
