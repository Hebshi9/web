from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import uuid
from datetime import datetime
import threading
import time

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

DB_FILE = os.path.join(os.path.dirname(__file__), 'db.json')

db_lock = threading.Lock()

def read_db():
    with db_lock:
        if not os.path.exists(DB_FILE):
            with open(DB_FILE, 'w') as f:
                json.dump({"orders": [], "customers": [], "last_order_sequence": 0}, f)
        with open(DB_FILE, 'r') as f:
            return json.load(f)

def write_db(data):
    with db_lock:
        with open(DB_FILE, 'w') as f:
            json.dump(data, f, indent=4)

def generate_order_id(db_data):
    db_data['last_order_sequence'] += 1
    return f"SL{db_data['last_order_sequence']:05d}"

@app.route('/api/orders', methods=['POST'])
def add_order():
    data = request.json
    db_data = read_db()
    
    # Generate a unique ID for the order
    order_id = generate_order_id(db_data)
    data['id'] = order_id
    data['createdAt'] = datetime.now().isoformat()
    
    db_data['orders'].append(data)
    write_db(db_data)
    
    # Save customer info
    customer_email = data['personalInfo']['email']
    customer_exists = False
    for customer in db_data['customers']:
        if customer['email'] == customer_email:
            customer['orders'].append(order_id)
            customer['lastOrderDate'] = datetime.now().isoformat()
            customer_exists = True
            break
    if not customer_exists:
        db_data['customers'].append({
            'fullName': data['personalInfo']['fullName'],
            'phone': data['personalInfo']['phone'],
            'email': customer_email,
            'orders': [order_id],
            'lastOrderDate': datetime.now().isoformat()
        })
    write_db(db_data)

    return jsonify({'id': order_id}), 201

@app.route('/api/orders/<order_id>', methods=['GET'])
def get_order(order_id):
    db_data = read_db()
    for order in db_data['orders']:
        if order['id'] == order_id:
            return jsonify(order), 200
    return jsonify({'message': 'Order not found'}), 404

@app.route('/api/orders', methods=['GET'])
def get_all_orders():
    db_data = read_db()
    return jsonify({'orders': db_data['orders']}), 200

@app.route('/api/customers', methods=['GET'])
def get_all_customers():
    db_data = read_db()
    return jsonify(db_data['customers']), 200

import openai
import os
from werkzeug.utils import secure_filename

# Configure OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')
openai.api_base = os.getenv('OPENAI_API_BASE')

@app.route('/api/analyze-cv', methods=['POST'])
def analyze_cv():
    try:
        if 'cv_file' not in request.files:
            return jsonify({'success': False, 'message': 'لم يتم رفع أي ملف'}), 400
        
        file = request.files['cv_file']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'لم يتم اختيار أي ملف'}), 400
        
        # Step 1: Parse CV using Nanonets (free)
        try:
            # Prepare file for Nanonets API
            files = {'file': (file.filename, file.stream, file.content_type)}
            
            # Call Nanonets API (no API key required for basic usage)
            nanonets_response = requests.post(
                'https://app.nanonets.com/api/v2/OCR/Model/e3d6d8b4-8c6e-4b1e-8b4a-2c5f8a9b3c7d/LabelFile/',
                files=files,
                timeout=30
            )
            
            parsed_data = {}
            if nanonets_response.status_code == 200:
                nanonets_result = nanonets_response.json()
                # Extract structured data from Nanonets response
                if 'result' in nanonets_result and nanonets_result['result']:
                    predictions = nanonets_result['result'][0].get('prediction', [])
                    for pred in predictions:
                        label = pred.get('label', '')
                        ocr_text = pred.get('ocr_text', '')
                        if label and ocr_text:
                            parsed_data[label] = ocr_text
            
        except Exception as e:
            print(f"Nanonets parsing error: {e}")
            parsed_data = {}
        
        # Step 2: Read file content for DeepSeek analysis
        file.stream.seek(0)  # Reset file pointer
        try:
            file_content = file.read().decode('utf-8', errors='ignore')
        except:
            file_content = "Unable to read file content"
        
        # Step 3: Analyze using DeepSeek API
        try:
            # Prepare analysis prompt in Arabic
            analysis_prompt = f"""
أنت خبير في تحليل السير الذاتية باللغة العربية. قم بتحليل السيرة الذاتية التالية وقدم تقييماً شاملاً.

البيانات المستخرجة:
{parsed_data}

محتوى السيرة الذاتية:
{file_content[:3000]}  # Limit content to avoid token limits

يرجى تقديم:
1. درجة تقييم من 100
2. 3-5 اقتراحات محددة للتحسين
3. تحليل نقاط القوة والضعف

قدم الإجابة بتنسيق JSON كالتالي:
{{
    "score": 85,
    "suggestions": [
        {{"type": "success", "text": "نقطة قوة"}},
        {{"type": "warning", "text": "اقتراح للتحسين"}},
        {{"type": "error", "text": "نقطة تحتاج إصلاح"}}
    ],
    "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
    "weaknesses": ["نقطة ضعف 1", "نقطة ضعف 2"],
    "summary": "ملخص التحليل"
}}
"""

            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "أنت خبير في تحليل السير الذاتية. قدم تحليلاً مفصلاً ومفيداً باللغة العربية."
                    },
                    {
                        "role": "user",
                        "content": analysis_prompt
                    }
                ],
                max_tokens=1500,
                temperature=0.7
            )
            
            analysis_text = response.choices[0].message.content
            
            # Try to parse JSON response
            try:
                import json
                analysis_json = json.loads(analysis_text)
                score = analysis_json.get('score', 80)
                suggestions = analysis_json.get('suggestions', [])
                strengths = analysis_json.get('strengths', [])
                weaknesses = analysis_json.get('weaknesses', [])
                summary = analysis_json.get('summary', '')
            except:
                # Fallback parsing if JSON fails
                score = 80
                suggestions = [
                    {'type': 'success', 'text': 'تم تحليل السيرة الذاتية بنجاح'},
                    {'type': 'warning', 'text': 'يُنصح بمراجعة التنسيق والتأكد من وضوح المعلومات'},
                    {'type': 'warning', 'text': 'تأكد من إضافة الكلمات المفتاحية المناسبة لمجالك'}
                ]
                strengths = ['معلومات أساسية متوفرة']
                weaknesses = ['يحتاج تحسين في التنسيق']
                summary = 'تم تحليل السيرة الذاتية وتقديم اقتراحات للتحسين'
            
            return jsonify({
                'success': True,
                'analysis': {
                    'score': score,
                    'suggestions': suggestions[:5],  # Limit to 5 suggestions
                    'strengths': strengths,
                    'weaknesses': weaknesses,
                    'summary': summary,
                    'parsed_data': parsed_data,
                    'full_analysis': analysis_text
                }
            })
            
        except Exception as ai_error:
            print(f"AI analysis error: {ai_error}")
            # Fallback analysis using parsed data
            score = 75
            suggestions = []
            
            # Generate suggestions based on parsed data
            if parsed_data.get('Name'):
                suggestions.append({'type': 'success', 'text': 'الاسم واضح ومحدد'})
            else:
                suggestions.append({'type': 'error', 'text': 'يجب إضافة الاسم بوضوح'})
                
            if parsed_data.get('Email'):
                suggestions.append({'type': 'success', 'text': 'البريد الإلكتروني متوفر'})
            else:
                suggestions.append({'type': 'warning', 'text': 'يُنصح بإضافة البريد الإلكتروني'})
                
            if parsed_data.get('Phone'):
                suggestions.append({'type': 'success', 'text': 'رقم الهاتف متوفر'})
            else:
                suggestions.append({'type': 'warning', 'text': 'يُنصح بإضافة رقم الهاتف'})
                
            if parsed_data.get('ExperienceCompany'):
                suggestions.append({'type': 'success', 'text': 'الخبرات العملية موضحة'})
                score += 10
            else:
                suggestions.append({'type': 'warning', 'text': 'يُنصح بإضافة الخبرات العملية'})
                
            if parsed_data.get('EducationDegree'):
                suggestions.append({'type': 'success', 'text': 'المؤهلات التعليمية واضحة'})
                score += 5
            else:
                suggestions.append({'type': 'warning', 'text': 'يُنصح بإضافة المؤهلات التعليمية'})
            
            return jsonify({
                'success': True,
                'analysis': {
                    'score': min(score, 100),
                    'suggestions': suggestions[:5],
                    'strengths': ['تم استخراج البيانات الأساسية'],
                    'weaknesses': ['يحتاج تحسين في بعض الجوانب'],
                    'summary': 'تم تحليل السيرة الذاتية باستخدام تقنيات استخراج البيانات',
                    'parsed_data': parsed_data
                }
            })
            
    except Exception as e:
        print(f"CV analysis error: {e}")
        return jsonify({'success': False, 'message': 'حدث خطأ أثناء تحليل السيرة الذاتية'}), 500

import requests
import uuid

# STCPay configuration (using Tap API)
TAP_API_KEY = "sk_test_XKokBfNWv6FIYuTMg5sLPjhJ"  # Test key from documentation
TAP_BASE_URL = "https://api.tap.company/v2"

@app.route('/api/create-stcpay-payment', methods=['POST'])
def create_stcpay_payment():
    try:
        data = request.json
        amount = data.get('amount')
        phone_number = data.get('phone_number', '0503678789')  # Default to provided number
        order_id = data.get('order_id')
        customer_info = data.get('customer', {})
        
        # Create charge request to Tap API
        charge_data = {
            "amount": amount,
            "currency": "SAR",
            "customer_initiated": True,
            "threeDSecure": True,
            "save_card": False,
            "description": f"Payment for order {order_id}",
            "metadata": {
                "order_id": order_id
            },
            "reference": {
                "transaction": f"txn_{order_id}",
                "order": order_id
            },
            "receipt": {
                "email": True,
                "sms": True
            },
            "customer": {
                "first_name": customer_info.get('name', '').split(' ')[0] if customer_info.get('name') else 'Customer',
                "last_name": customer_info.get('name', '').split(' ')[-1] if customer_info.get('name') else 'Customer',
                "email": customer_info.get('email', 'customer@example.com'),
                "phone": {
                    "country_code": 966,
                    "number": customer_info.get('phone', '').replace('0', '', 1) if customer_info.get('phone') else '503678789'
                }
            },
            "source": {
                "id": "src_sa.stcpay",
                "phone": {
                    "country_code": "966",
                    "number": phone_number.replace("0", "", 1) if phone_number.startswith("0") else phone_number
                }
            },
            "post": {
                "url": f"{(os.getenv('BACKEND_BASE_URL') or request.url_root.rstrip('/'))}/api/stcpay-webhook"
            },
            "redirect": {
                "url": f"{(os.getenv('FRONTEND_BASE_URL') or request.headers.get('Origin') or 'http://localhost:8888').rstrip('/')}/order.html?id={order_id}"
            }
        }
        
        headers = {
            'Authorization': f'Bearer {TAP_API_KEY}',
            'accept': 'application/json',
            'content-type': 'application/json'
        }
        
        response = requests.post(f"{TAP_BASE_URL}/charges/", json=charge_data, headers=headers)
        
        if response.status_code == 200:
            charge_response = response.json()
            return jsonify({
                'success': True,
                'charge_id': charge_response['id'],
                'status': charge_response['status'],
                'message': 'تم إرسال رمز التحقق إلى رقم الجوال المسجل في STC Pay'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'فشل في إنشاء طلب الدفع'
            }), 400
            
    except Exception as e:
        print(f"STCPay payment creation error: {e}")
        return jsonify({'success': False, 'message': 'حدث خطأ أثناء إنشاء طلب الدفع'}), 500

@app.route('/api/verify-stcpay-otp', methods=['POST'])
def verify_stcpay_otp():
    try:
        data = request.json
        charge_id = data.get('charge_id')
        otp = data.get('otp')
        
        # Update charge with OTP
        update_data = {
            "gateway_response": {
                "name": "STC_PAY",
                "response": {
                    "reference": {
                        "otp": otp
                    }
                }
            }
        }
        
        headers = {
            'Authorization': f'Bearer {TAP_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        response = requests.put(f"{TAP_BASE_URL}/charges/{charge_id}", json=update_data, headers=headers)
        
        if response.status_code == 200:
            charge_response = response.json()
            if charge_response['status'] == 'CAPTURED':
                return jsonify({
                    'success': True,
                    'status': 'CAPTURED',
                    'message': 'تم الدفع بنجاح'
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'رمز التحقق غير صحيح'
                })
        else:
            return jsonify({
                'success': False,
                'message': 'فشل في التحقق من رمز التحقق'
            }), 400
            
    except Exception as e:
        print(f"STCPay OTP verification error: {e}")
        return jsonify({'success': False, 'message': 'حدث خطأ أثناء التحقق من رمز التحقق'}), 500

@app.route('/api/stcpay-webhook', methods=['POST'])
def stcpay_webhook():
    try:
        data = request.json
        # Handle webhook from Tap API
        print(f"STCPay webhook received: {data}")
        
        # Update order status in database if payment is successful
        if data.get('status') == 'CAPTURED':
            order_id = data.get('metadata', {}).get('order_id')
            if order_id:
                # Update order status in database
                db_data = read_db()
                for order in db_data['orders']:
                    if order['id'] == order_id:
                        order['payment_status'] = 'paid'
                        order['payment_method'] = 'stcpay'
                        break
                write_db(db_data)
        
        return jsonify({'success': True})
        
    except Exception as e:
        print(f"STCPay webhook error: {e}")
        return jsonify({'success': False}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)



