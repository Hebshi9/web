// Global variables
let currentPackage = null;
let basePrice = 0;
let discountPercentage = 0;
let currentOrderId = null;

// Package data
const packages = {
    'basic': {
        name: 'الباقة الأساسية',
        price: Math.round(199 * 0.8),
        features: [
            'كتابة سيرة ذاتية احترافية',
            'تحسين للتوافق مع ATS',
            'مراجعة واحدة مجانية'
        ]
    },
    'premium': {
        name: 'الباقة المتقدمة',
        price: Math.round(349 * 0.8),
        features: [
            'كل ما في الباقة الأساسية',
            'تحسين ملف LinkedIn',
            'مراجعتان مجانيتان'
        ]
    },
    'vip': {
        name: 'باقة VIP المتكاملة',
        price: Math.round(499 * 0.8),
        features: [
            'كل ما في الباقة المتقدمة',
            'خطاب تغطية مخصص',
            'متابعة لمدة شهر',
            'مراجعات غير محدودة'
        ]
    },
    'cv-improvement': {
        name: 'تحسين السيرة الذاتية',
        price: Math.round(299 * 0.8),
        features: [
            'تحليل شامل للسيرة الحالية',
            'إعادة كتابة احترافية',
            'تحسين للتوافق مع ATS',
            'مراجعتان مجانيتان'
        ]
    },
    'linkedin-junior': {
        name: 'ملف LinkedIn - مبتدئ (0-2 سنوات خبرة)',
        price: Math.round(150 * 0.8),
        features: [
            'إنشاء أو تحسين ملف LinkedIn',
            'تحسين الكلمات المفتاحية',
            'نصائح للبحث عن وظائف'
        ]
    },
    'linkedin-mid': {
        name: 'ملف LinkedIn - متوسط (3-8 سنوات خبرة)',
        price: Math.round(250 * 0.8),
        features: [
            'كل ما في باقة المبتدئ',
            'صياغة ملخص احترافي',
            'تحسين قسم الخبرات والإنجازات'
        ]
    },
    'linkedin-senior': {
        name: 'ملف LinkedIn - خبير (8+ سنوات خبرة)',
        price: Math.round(350 * 0.8),
        features: [
            'كل ما في باقة المتوسط',
            'استراتيجية بناء الشبكة',
            'تحسين الظهور كقائد فكر'
        ]
    }
};

// Discount codes
const discountCodes = {
    'WELCOME20': 20,
    'STUDENT15': 15,
    'FIRST10': 10,
    'VIP25': 25,
    'SAVE15': 15
};

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    initializeCVUpload();
    initializeOrderForm();
});

// Smooth scrolling functions
function scrollToServices() {
    const servicesSection = document.getElementById('services');
    if (servicesSection) {
        servicesSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function scrollToCVAnalysis() {
    const cvSection = document.getElementById('cv-analysis');
    if (cvSection) {
        cvSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// CV Analysis functionality
function initializeCVUpload() {
    const uploadArea = document.getElementById('cv-upload-area');
    const fileInput = document.getElementById('cv-file-input');

    if (!uploadArea || !fileInput) {
        console.log('CV upload elements not found');
        return;
    }

    // Click to upload
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', handleFileUpload);

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload({ target: { files: files } });
        }
    });
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
        alert('يرجى رفع ملف PDF أو DOCX أو TXT فقط');
        return;
    }

    // Show loading
    const uploadArea = document.getElementById('cv-upload-area');
    uploadArea.innerHTML = `
        <i class="fas fa-spinner fa-spin text-4xl text-sals-secondary mb-4"></i>
        <h3 class="text-xl font-bold text-sals-dark mb-2">جاري تحليل السيرة الذاتية...</h3>
        <p class="text-gray-600">يرجى الانتظار قليلاً</p>
    `;

    // Create FormData to send file to backend
    const formData = new FormData();
    formData.append('cv_file', file);

    // Send to backend for analysis
    fetch(`${API_BASE}/api/analyze-cv`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showCVAnalysisResult(data.analysis);
        } else {
            throw new Error(data.message || 'فشل في تحليل السيرة الذاتية');
        }
    })
    .catch(error => {
        console.error('Error analyzing CV:', error);
        uploadArea.innerHTML = `
            <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
            <h3 class="text-xl font-bold text-red-600 mb-2">خطأ في التحليل</h3>
            <p class="text-gray-600">حدث خطأ أثناء تحليل السيرة الذاتية. يرجى المحاولة مرة أخرى.</p>
            <button onclick="location.reload()" class="mt-4 bg-sals-primary text-white px-4 py-2 rounded hover:bg-sals-secondary">إعادة المحاولة</button>
        `;
    });
}

function showCVAnalysisResult(analysisData = null) {
    let score, suggestions;
    
    if (analysisData) {
        // Use real analysis data from backend
        score = analysisData.score || 75;
        suggestions = analysisData.suggestions || [];
    } else {
        // Fallback to random data if no analysis provided
        const scores = [75, 80, 85, 90, 95];
        score = scores[Math.floor(Math.random() * scores.length)];
        
        suggestions = [
            { type: 'success', text: 'تنسيق ممتاز ومتوافق مع أنظمة ATS' },
            { type: 'warning', text: 'يُنصح بإضافة المزيد من الكلمات المفتاحية' },
            { type: 'error', text: 'قسم المهارات يحتاج إلى تطوير' },
            { type: 'success', text: 'الخبرات العملية موضحة بشكل جيد' },
            { type: 'warning', text: 'يمكن تحسين قسم التعليم' }
        ].sort(() => 0.5 - Math.random()).slice(0, 3);
    }

    const scoreElement = document.getElementById('cv-score');
    if (scoreElement) {
        scoreElement.textContent = score;
    }
    
    const suggestionsList = document.getElementById('cv-suggestions');
    if (suggestionsList) {
        suggestionsList.innerHTML = '';
        
        suggestions.forEach(suggestion => {
            const iconClass = suggestion.type === 'success' ? 'fas fa-check-circle text-green-500' :
                             suggestion.type === 'warning' ? 'fas fa-exclamation-triangle text-yellow-500' :
                             'fas fa-times-circle text-red-500';
            
            const li = document.createElement('li');
            li.className = 'flex items-start';
            li.innerHTML = `
                <i class="${iconClass} ml-2 mt-1"></i>
                <span>${suggestion.text}</span>
            `;
            suggestionsList.appendChild(li);
        });
    }

    const resultDiv = document.getElementById('cv-analysis-result');
    if (resultDiv) {
        resultDiv.classList.remove('hidden');
    }
}

// Order Modal functionality
function showOrderModal(packageType) {
    console.log('Showing order modal for package:', packageType);
    currentPackage = packageType;
    const modal = document.getElementById('orderModal');
    const selectedPackageDiv = document.getElementById('selectedPackage');
    
    if (!modal) {
        console.error('Order modal not found');
        return;
    }
    
    const pkg = packages[packageType];
    if (!pkg) {
        console.error('Package not found:', packageType);
        return;
    }
    
    basePrice = pkg.price;
    
    if (selectedPackageDiv) {
        selectedPackageDiv.innerHTML = `
            <h5 class="font-bold text-sals-primary text-lg mb-2">${pkg.name}</h5>
            <p class="text-2xl font-bold text-sals-dark mb-3">${pkg.price} ر.س</p>
            <ul class="space-y-1">
                ${pkg.features.map(feature => `<li class="flex items-center text-sm"><i class="fas fa-check text-green-500 ml-2"></i><span>${feature}</span></li>`).join('')}
            </ul>
        `;
    }
    
    updateTotalPrice();
    modal.classList.add('show');
}

function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.classList.remove('show');
    }
    resetOrderForm();
}

function resetOrderForm() {
    const form = document.getElementById('orderForm');
    if (form) {
        form.reset();
    }
    
    const coverLetter = document.getElementById('coverLetter');
    const interviewPrep = document.getElementById('interviewPrep');
    const discountCode = document.getElementById('discountCode');
    const discountMessage = document.getElementById('discountMessage');
    const discountAmount = document.getElementById('discountAmount');
    
    if (coverLetter) coverLetter.checked = false;
    if (interviewPrep) interviewPrep.checked = false;
    if (discountCode) discountCode.value = '';
    if (discountMessage) discountMessage.innerHTML = '';
    if (discountAmount) discountAmount.classList.add('hidden');
    
    discountPercentage = 0;
    updateTotalPrice();
}

function updateTotalPrice() {
    let total = basePrice;
    
    // Add upselling services
    const coverLetter = document.getElementById('coverLetter');
    const interviewPrep = document.getElementById('interviewPrep');
    
    if (coverLetter && coverLetter.checked) {
        total += 79;
    }
    if (interviewPrep && interviewPrep.checked) {
        total += 149;
    }
    
    // Apply discount
    const discountAmount = Math.round(total * (discountPercentage / 100));
    const finalTotal = total - discountAmount;
    
    const totalPriceElement = document.getElementById('totalPrice');
    if (totalPriceElement) {
        totalPriceElement.textContent = `${finalTotal} ر.س`;
    }
    
    const discountAmountDiv = document.getElementById('discountAmount');
    const discountValueElement = document.getElementById('discountValue');
    
    if (discountPercentage > 0) {
        if (discountAmountDiv) discountAmountDiv.classList.remove('hidden');
        if (discountValueElement) discountValueElement.textContent = discountAmount;
    } else {
        if (discountAmountDiv) discountAmountDiv.classList.add('hidden');
    }
}

function applyDiscount() {
    const discountCodeInput = document.getElementById('discountCode');
    const messageDiv = document.getElementById('discountMessage');
    
    if (!discountCodeInput || !messageDiv) return;
    
    const code = discountCodeInput.value.trim().toUpperCase();
    
    if (discountCodes[code]) {
        discountPercentage = discountCodes[code];
        messageDiv.innerHTML = `<span class="text-green-600">تم تطبيق الخصم بنجاح! خصم ${discountPercentage}%</span>`;
        updateTotalPrice();
    } else if (code === '') {
        messageDiv.innerHTML = '<span class="text-red-600">يرجى إدخال كود الخصم</span>';
    } else {
        messageDiv.innerHTML = '<span class="text-red-600">كود الخصم غير صحيح</span>';
        discountPercentage = 0;
        updateTotalPrice();
    }
}

// Initialize order form
function initializeOrderForm() {
    const form = document.getElementById('orderForm');
    if (form) {
        form.addEventListener('submit', handleOrderSubmit);
    }
    
    // Add event listeners for upselling checkboxes
    const coverLetter = document.getElementById('coverLetter');
    const interviewPrep = document.getElementById('interviewPrep');
    
    if (coverLetter) {
        coverLetter.addEventListener('change', updateTotalPrice);
    }
    if (interviewPrep) {
        interviewPrep.addEventListener('change', updateTotalPrice);
    }
}

async function handleOrderSubmit(event) {
    event.preventDefault();
    console.log('Submitting order...');
    
    // Get form data
    const formData = {
        package: currentPackage,
        packageName: packages[currentPackage].name,
        basePrice: basePrice,
        upsellServices: {
            coverLetter: document.getElementById('coverLetter')?.checked || false,
            interviewPrep: document.getElementById('interviewPrep')?.checked || false
        },
        personalInfo: {
            fullName: document.getElementById('fullName')?.value || '',
            phone: document.getElementById('phone')?.value || '',
            email: document.getElementById('email')?.value || ''
        },
        goals: {
            dreamCompanies: document.getElementById('dreamCompanies')?.value || '',
            achievements: document.getElementById('achievements')?.value || '',
            targetPosition: document.getElementById('targetPosition')?.value || ''
        },
        discountCode: document.getElementById('discountCode')?.value || '',
        discountPercentage: discountPercentage,
        totalPrice: parseInt(document.getElementById('totalPrice')?.textContent.replace(' ر.س', '') || '0'),
        status: 'جديد',
        createdAt: new Date().toISOString(),
        assignedTo: '',
        internalNotes: ''
    };

    try {
        if (!window.db) {
            throw new Error('لم يتم تهيئة قاعدة البيانات');
        }

        // Create order in Firestore
        const orderRef = await window.db.collection('orders').add(formData);
        currentOrderId = orderRef.id;

        console.log("Order submitted to Firestore:", { id: currentOrderId });
        
        // Show payment options modal (uses currentOrderId)
        showPaymentModal(currentOrderId, formData.totalPrice, formData);
        closeOrderModal();
        
    } catch (error) {
        console.error("Error saving order:", error);
        alert(`حدث خطأ في إرسال الطلب: ${error.message}. يرجى المحاولة مرة أخرى.`);
    }
}

function showPaymentModal(orderId, amount, orderData) {
    const paymentModal = document.createElement('div');
    paymentModal.className = 'modal-overlay';
    paymentModal.id = 'paymentModal';
    paymentModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>اختر طريقة الدفع</h3>
                <button class="close-btn" onclick="closePaymentModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="payment-summary">
                    <h4>ملخص الطلب</h4>
                    <p><strong>المبلغ الإجمالي:</strong> ${amount} ر.س</p>
                    <p><strong>رقم الطلب:</strong> ${orderId}</p>
                </div>
                
                <div class="payment-methods">
                    <button class="payment-method-btn stcpay-btn" onclick="initiateSTCPayPayment('${orderId}', ${amount}, ${JSON.stringify(orderData).replace(/"/g, '&quot;')})">
                        <i class="fas fa-mobile-alt"></i>
                        الدفع عبر STC Pay
                    </button>
                    
                    <button class="payment-method-btn bank-transfer-btn" onclick="showBankTransferInfo('${orderId}')">
                        <i class="fas fa-university"></i>
                        التحويل البنكي
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(paymentModal);
    paymentModal.classList.add('show');
}

function initiateSTCPayPayment(orderId, amount, orderDataStr) {
    const orderData = JSON.parse(orderDataStr.replace(/&quot;/g, '"'));
    
    // Show loading
    const stcPayBtn = document.querySelector('.stcpay-btn');
    stcPayBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المعالجة...';
    stcPayBtn.disabled = true;
    
    // Create STCPay payment
    fetch(`${API_BASE}/api/create-stcpay-payment`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: amount,
            phone_number: '0503678789', // Your provided number
            order_id: orderId,
            customer: {
                name: orderData.personalInfo.fullName,
                email: orderData.personalInfo.email,
                phone: orderData.personalInfo.phone
            }
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showOTPModal(data.charge_id, orderId);
        } else {
            throw new Error(data.message || 'فشل في إنشاء طلب الدفع');
        }
    })
    .catch(error => {
        console.error('Error creating STCPay payment:', error);
        alert('حدث خطأ أثناء إنشاء طلب الدفع. يرجى المحاولة مرة أخرى.');
        stcPayBtn.innerHTML = '<i class="fas fa-mobile-alt"></i> الدفع عبر STC Pay';
        stcPayBtn.disabled = false;
    });
}

function showOTPModal(chargeId, orderId) {
    closePaymentModal();
    
    const otpModal = document.createElement('div');
    otpModal.className = 'modal-overlay';
    otpModal.id = 'otpModal';
    otpModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>تأكيد الدفع - STC Pay</h3>
            </div>
            <div class="modal-body">
                <div class="otp-info text-center">
                    <i class="fas fa-mobile-alt text-4xl text-green-500 mb-4"></i>
                    <p class="mb-4">تم إرسال رمز التحقق إلى رقم الجوال المسجل في STC Pay</p>
                    <p class="text-sm text-gray-600 mb-6">يرجى إدخال الرمز المرسل لإتمام عملية الدفع</p>
                </div>
                
                <div class="otp-input-group">
                    <label for="otpInput">رمز التحقق:</label>
                    <input type="text" id="otpInput" placeholder="أدخل رمز التحقق" maxlength="6" class="form-control">
                </div>
                
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="verifySTCPayOTP('${chargeId}', '${orderId}')">تأكيد الدفع</button>
                    <button class="btn btn-secondary" onclick="closeOTPModal()">إلغاء</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(otpModal);
    otpModal.classList.add('show');
    
    // Focus on OTP input
    setTimeout(() => {
        document.getElementById('otpInput').focus();
    }, 100);
}

function verifySTCPayOTP(chargeId, orderId) {
    const otp = document.getElementById('otpInput').value;
    
    if (!otp || otp.length < 4) {
        alert('يرجى إدخال رمز التحقق');
        return;
    }
    
    // Show loading
    const verifyBtn = document.querySelector('#otpModal .btn-primary');
    verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
    verifyBtn.disabled = true;
    
    // Verify OTP
    fetch(`${API_BASE}/api/verify-stcpay-otp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            charge_id: chargeId,
            otp: otp
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.status === 'CAPTURED') {
            closeOTPModal();
            showPaymentSuccess(orderId);
        } else {
            alert(data.message || 'رمز التحقق غير صحيح');
            verifyBtn.innerHTML = 'تأكيد الدفع';
            verifyBtn.disabled = false;
        }
    })
    .catch(error => {
        console.error('Error verifying OTP:', error);
        alert('حدث خطأ أثناء التحقق من رمز التحقق');
        verifyBtn.innerHTML = 'تأكيد الدفع';
        verifyBtn.disabled = false;
    });
}

function showBankTransferInfo(orderId) {
    closePaymentModal();
    
    const bankModal = document.createElement('div');
    bankModal.className = 'modal-overlay';
    bankModal.id = 'bankModal';
    bankModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>معلومات التحويل البنكي</h3>
                <button class="close-btn" onclick="closeBankModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="bank-info">
                    <h4>يرجى التحويل على الحساب التالي:</h4>
                    <div class="bank-details">
                        <p><strong>اسم البنك:</strong> البنك الأهلي السعودي</p>
                        <p><strong>رقم الحساب:</strong> SA1234567890123456789</p>
                        <p><strong>اسم المستفيد:</strong> شركة سلس للخدمات المهنية</p>
                        <p><strong>رقم الطلب:</strong> ${orderId}</p>
                    </div>
                    
                    <div class="transfer-instructions">
                        <h5>تعليمات مهمة:</h5>
                        <ul>
                            <li>يرجى كتابة رقم الطلب في خانة البيان</li>
                            <li>إرسال صورة من إيصال التحويل عبر الواتساب: 0503678789</li>
                            <li>سيتم البدء في تنفيذ الطلب خلال 24 ساعة من تأكيد التحويل</li>
                        </ul>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="btn btn-success" onclick="window.open('https://wa.me/966503678789?text=تم التحويل لطلب رقم: ${orderId}', '_blank')">
                        <i class="fab fa-whatsapp"></i> إرسال عبر الواتساب
                    </button>
                    <button class="btn btn-secondary" onclick="closeBankModal()">إغلاق</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(bankModal);
    bankModal.classList.add('show');
}

function showPaymentSuccess(orderId) {
    // Create order link
    const orderLink = `https://ahagagiw.manus.space/order.html?id=${orderId}`;
    
    const successModal = document.createElement('div');
    successModal.className = 'modal-overlay';
    successModal.id = 'paymentSuccessModal';
    successModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>تم الدفع بنجاح!</h3>
            </div>
            <div class="modal-body text-center">
                <i class="fas fa-check-circle text-6xl text-green-500 mb-4"></i>
                <h4 class="text-green-600 mb-4">تم إتمام عملية الدفع بنجاح</h4>
                <p class="mb-4">سيتم التواصل معك قريباً لبدء العمل على طلبك</p>
                
                <div class="order-link-section">
                    <p class="mb-2">رابط متابعة الطلب:</p>
                    <div class="input-group">
                        <input type="text" value="${orderLink}" readonly class="form-control">
                        <button onclick="copyOrderLink('${orderLink}')" class="btn btn-outline-primary">نسخ</button>
                    </div>
                </div>
                
                <div class="modal-actions mt-4">
                    <button class="btn btn-success" onclick="window.open('https://wa.me/966503678789?text=تم الدفع لطلب رقم: ${orderId}', '_blank')">
                        <i class="fab fa-whatsapp"></i> تواصل معنا
                    </button>
                    <button class="btn btn-primary" onclick="closePaymentSuccessModal()">إغلاق</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(successModal);
    successModal.classList.add('show');
}

function copyOrderLink(link) {
    navigator.clipboard.writeText(link).then(() => {
        alert('تم نسخ الرابط بنجاح');
    });
}

function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.remove();
    }
}

function closeOTPModal() {
    const modal = document.getElementById('otpModal');
    if (modal) {
        modal.remove();
    }
}

function closeBankModal() {
    const modal = document.getElementById('bankModal');
    if (modal) {
        modal.remove();
    }
}

function closePaymentSuccessModal() {
    const modal = document.getElementById('paymentSuccessModal');
    if (modal) {
        modal.remove();
    }
    location.reload();
}

function showSuccessModal() {
    const modal = document.getElementById('successModal');
    const portalLinkInput = document.getElementById('clientPortalLink');
    
    if (modal && portalLinkInput && currentOrderId) {
        const portalLink = `${window.location.origin}/order.html?id=${currentOrderId}`;
        portalLinkInput.value = portalLink;
        modal.classList.add('show');
    }
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function copyPortalLink() {
    const linkInput = document.getElementById('clientPortalLink');
    if (linkInput) {
        linkInput.select();
        document.execCommand('copy');
        
        // Show feedback
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = 'تم النسخ!';
        button.classList.add('bg-green-500');
        button.classList.remove('bg-sals-primary');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('bg-green-500');
            button.classList.add('bg-sals-primary');
        }, 2000);
    }
}

function shareViaWhatsApp() {
    const portalLinkInput = document.getElementById('clientPortalLink');
    if (portalLinkInput) {
        const portalLink = portalLinkInput.value;
        const message = `مرحباً، تم إرسال طلبي بنجاح في منصة سلس. رابط بوابة العميل: ${portalLink}`;
        const whatsappUrl = `https://wa.me/966503678789?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }
}

// Make functions globally available
window.scrollToServices = scrollToServices;
window.scrollToCVAnalysis = scrollToCVAnalysis;
window.showOrderModal = showOrderModal;
window.closeOrderModal = closeOrderModal;
window.applyDiscount = applyDiscount;
window.showSuccessModal = showSuccessModal;
window.closeSuccessModal = closeSuccessModal;
window.copyPortalLink = copyPortalLink;
window.shareViaWhatsApp = shareViaWhatsApp;

