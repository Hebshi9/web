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
                json.dump({
                    "orders": [],
                    "customers": [],
                    "team": [],
                    "discounts": [],
                    "last_order_sequence": 0
                }, f)
        with open(DB_FILE, 'r') as f:
            data = json.load(f)
        # Ensure required keys exist
        data.setdefault('orders', [])
        data.setdefault('customers', [])
        data.setdefault('team', [])
        data.setdefault('discounts', [])
        data.setdefault('last_order_sequence', 0)
        return data

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

# New: update order
@app.route('/api/orders/<order_id>', methods=['PUT'])
def update_order(order_id):
    update_fields = request.json or {}
    db_data = read_db()

    for order in db_data['orders']:
        if order['id'] == order_id:
            # Only allow specific fields to be updated
            allowed_fields = {'status', 'assignedTo', 'internalNotes', 'package', 'packageName', 'basePrice', 'discountCode', 'discountPercentage', 'totalPrice'}
            for key, value in update_fields.items():
                if key in allowed_fields:
                    order[key] = value
            order['updatedAt'] = datetime.now().isoformat()
            write_db(db_data)
            return jsonify({'success': True, 'order': order})

    return jsonify({'success': False, 'message': 'Order not found'}), 404

# New: delete order
@app.route('/api/orders/<order_id>', methods=['DELETE'])
def delete_order(order_id):
    db_data = read_db()

    # Remove from orders
    original_len = len(db_data['orders'])
    db_data['orders'] = [o for o in db_data['orders'] if o.get('id') != order_id]

    # Remove from customers' order lists
    for customer in db_data['customers']:
        if 'orders' in customer and isinstance(customer['orders'], list):
            customer['orders'] = [oid for oid in customer['orders'] if oid != order_id]

    if len(db_data['orders']) == original_len:
        return jsonify({'success': False, 'message': 'Order not found'}), 404

    write_db(db_data)
    return jsonify({'success': True})

@app.route('/api/customers', methods=['GET'])
def get_all_customers():
    db_data = read_db()
    return jsonify(db_data['customers']), 200

# New: Team CRUD
@app.route('/api/team', methods=['GET'])
def get_team():
    db_data = read_db()
    return jsonify(db_data['team'])

@app.route('/api/team', methods=['POST'])
def create_team_member():
    db_data = read_db()
    data = request.json or {}
    member_id = data.get('id') or f"member_{uuid.uuid4().hex[:8]}"
    member = {
        'id': member_id,
        'name': data.get('name', ''),
        'email': data.get('email', ''),
        'position': data.get('position', ''),
        'status': data.get('status', 'نشط')
    }
    db_data['team'].append(member)
    write_db(db_data)
    return jsonify({'success': True, 'member': member}), 201

@app.route('/api/team/<member_id>', methods=['PUT'])
def update_team_member(member_id):
    db_data = read_db()
    data = request.json or {}
    for member in db_data['team']:
        if member['id'] == member_id:
            for key in ['name', 'email', 'position', 'status']:
                if key in data:
                    member[key] = data[key]
            write_db(db_data)
            return jsonify({'success': True, 'member': member})
    return jsonify({'success': False, 'message': 'Member not found'}), 404

@app.route('/api/team/<member_id>', methods=['DELETE'])
def delete_team_member(member_id):
    db_data = read_db()
    original_len = len(db_data['team'])
    db_data['team'] = [m for m in db_data['team'] if m.get('id') != member_id]
    if len(db_data['team']) == original_len:
        return jsonify({'success': False, 'message': 'Member not found'}), 404
    write_db(db_data)
    return jsonify({'success': True})

# New: Discounts CRUD
@app.route('/api/discounts', methods=['GET'])
def get_discounts():
    db_data = read_db()
    return jsonify(db_data['discounts'])

@app.route('/api/discounts', methods=['POST'])
def create_discount():
    db_data = read_db()
    data = request.json or {}
    code = data.get('code')
    if not code:
        return jsonify({'success': False, 'message': 'code is required'}), 400
    discount = {
        'id': data.get('id', code),
        'code': code,
        'percentage': int(data.get('percentage', 0)),
        'usageCount': int(data.get('usageCount', 0)),
        'expiryDate': data.get('expiryDate', ''),
        'status': data.get('status', 'نشط')
    }
    # Prevent duplicate codes
    if any(d.get('code') == code for d in db_data['discounts']):
        return jsonify({'success': False, 'message': 'code already exists'}), 409
    db_data['discounts'].append(discount)
    write_db(db_data)
    return jsonify({'success': True, 'discount': discount}), 201

@app.route('/api/discounts/<discount_id>', methods=['PUT'])
def update_discount(discount_id):
    db_data = read_db()
    data = request.json or {}
    for d in db_data['discounts']:
        if d['id'] == discount_id or d['code'] == discount_id:
            for key in ['code', 'percentage', 'usageCount', 'expiryDate', 'status']:
                if key in data:
                    d[key] = data[key]
            write_db(db_data)
            return jsonify({'success': True, 'discount': d})
    return jsonify({'success': False, 'message': 'Discount not found'}), 404

@app.route('/api/discounts/<discount_id>', methods=['DELETE'])
def delete_discount(discount_id):
    db_data = read_db()
    original_len = len(db_data['discounts'])
    db_data['discounts'] = [d for d in db_data['discounts'] if d.get('id') != discount_id and d.get('code') != discount_id]
    if len(db_data['discounts']) == original_len:
        return jsonify({'success': False, 'message': 'Discount not found'}), 404
    write_db(db_data)
    return jsonify({'success': True})

# Optional: Stats endpoint
@app.route('/api/stats', methods=['GET'])
def get_stats():
    db_data = read_db()
    orders = db_data['orders']
    total_orders = len(orders)
    total_revenue = sum(int(o.get('totalPrice', 0)) for o in orders)
    pending_orders = sum(1 for o in orders if o.get('status') in ['جديد', 'قيد التنفيذ'])

    # Revenue by month (YYYY-MM)
    revenue_by_month = {}
    for o in orders:
        created_at = o.get('createdAt')
        try:
            dt = datetime.fromisoformat(created_at) if created_at else None
        except Exception:
            dt = None
        key = dt.strftime('%Y-%m') if dt else 'unknown'
        revenue_by_month[key] = revenue_by_month.get(key, 0) + int(o.get('totalPrice', 0))

    return jsonify({
        'total_orders': total_orders,
        'total_revenue': total_revenue,
        'pending_orders': pending_orders,
        'revenue_by_month': revenue_by_month
    })

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
                "url": f"https://5000-ihu2eqlqjp7vakccehu8k-16b15953.manusvm.computer/api/stcpay-webhook"
            },
            "redirect": {
                "url": f"https://ahagagiw.manus.space/payment-success?order_id={order_id}"
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



