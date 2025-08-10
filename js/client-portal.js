// Global variables
let currentOrderId = null;
let orderData = null;
let messagesListener = null;

// Initialize client portal
document.addEventListener('DOMContentLoaded', function() {
    // Get order ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentOrderId = urlParams.get('id');
    
    if (!currentOrderId) {
        showError();
        return;
    }
    
    loadOrderData();
    initializeMessaging();
});

// Load order data
async function loadOrderData() {
    try {
        const orderDoc = await db.collection('orders').doc(currentOrderId).get();
        
        if (!orderDoc.exists) {
            showError();
            return;
        }
        
        orderData = { id: orderDoc.id, ...orderDoc.data() };
        displayOrderData();
        updateTimeline();
        loadMessages();
        hideLoading();
        
    } catch (error) {
        console.error('Error loading order data:', error);
        showError();
    }
}

// Display order data
function displayOrderData() {
    // Order number
    document.getElementById('orderNumber').textContent = currentOrderId.substring(0, 8).toUpperCase();
    
    // Package details
    document.getElementById('packageName').textContent = orderData.packageName || 'غير محدد';
    document.getElementById('basePrice').textContent = `${orderData.basePrice || 0} ر.س`;
    document.getElementById('totalPrice').textContent = `${orderData.totalPrice || 0} ر.س`;
    
    // Additional services
    const additionalServices = [];
    if (orderData.upsellServices?.coverLetter) {
        additionalServices.push('خطاب التغطية');
    }
    if (orderData.upsellServices?.interviewPrep) {
        additionalServices.push('محاكاة المقابلة');
    }
    document.getElementById('additionalServices').textContent = 
        additionalServices.length > 0 ? additionalServices.join(', ') : 'لا يوجد';
    
    // Order info
    const orderDate = orderData.createdAt?.toDate ? 
        orderData.createdAt.toDate().toLocaleDateString('ar-SA') : 
        'غير محدد';
    document.getElementById('orderDate').textContent = orderDate;
    document.getElementById('receivedDate').textContent = orderDate;
    
    // Current status
    const statusElement = document.getElementById('currentStatus');
    statusElement.textContent = orderData.status || 'جديد';
    statusElement.className = `font-medium px-3 py-1 rounded-full text-sm ${getStatusClass(orderData.status)}`;
    
    // Assigned to
    document.getElementById('assignedTo').textContent = orderData.assignedTo || 'لم يتم التحديد بعد';
}

// Update timeline based on order status
function updateTimeline() {
    const status = orderData.status || 'جديد';
    
    // Reset all icons
    const icons = ['reviewIcon', 'workIcon', 'deliveryIcon'];
    icons.forEach(iconId => {
        const icon = document.getElementById(iconId);
        icon.className = 'timeline-icon pending';
    });
    
    // Update based on current status
    switch(status) {
        case 'قيد التنفيذ':
            document.getElementById('reviewIcon').className = 'timeline-icon completed';
            document.getElementById('workIcon').className = 'timeline-icon active';
            document.getElementById('reviewDate').textContent = 'مكتمل';
            document.getElementById('workDate').textContent = 'جاري العمل...';
            break;
            
        case 'مكتمل':
            document.getElementById('reviewIcon').className = 'timeline-icon completed';
            document.getElementById('workIcon').className = 'timeline-icon completed';
            document.getElementById('deliveryIcon').className = 'timeline-icon completed';
            document.getElementById('reviewDate').textContent = 'مكتمل';
            document.getElementById('workDate').textContent = 'مكتمل';
            document.getElementById('deliveryDate').textContent = 'تم التسليم';
            break;
            
        case 'ملغي':
            // Keep all as pending for cancelled orders
            break;
            
        default: // 'جديد'
            document.getElementById('reviewIcon').className = 'timeline-icon active';
            document.getElementById('reviewDate').textContent = 'قيد المراجعة...';
            break;
    }
}

// Get status class for styling
function getStatusClass(status) {
    switch(status) {
        case 'جديد':
            return 'bg-blue-100 text-blue-800';
        case 'قيد التنفيذ':
            return 'bg-yellow-100 text-yellow-800';
        case 'مكتمل':
            return 'bg-green-100 text-green-800';
        case 'ملغي':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

// Initialize messaging
function initializeMessaging() {
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

// Load messages
function loadMessages() {
    // Listen for real-time messages
    messagesListener = db.collection('messages')
        .where('orderId', '==', currentOrderId)
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            displayMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
}

// Display messages
function displayMessages(messages) {
    const container = document.getElementById('messagesContainer');
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="fas fa-comments text-3xl mb-2"></i>
                <p>لا توجد رسائل حتى الآن</p>
                <p class="text-sm">ابدأ محادثة مع فريقنا</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    messages.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-bubble ${message.sender === 'client' ? 'client' : 'admin'}`;
        
        const timestamp = message.timestamp?.toDate ? 
            message.timestamp.toDate().toLocaleString('ar-SA') : 
            'الآن';
        
        messageDiv.innerHTML = `
            <div class="p-3 rounded-lg ${message.sender === 'client' ? 'bg-sals-primary text-white' : 'bg-gray-200 text-gray-800'}">
                <p class="mb-1">${message.text}</p>
                <p class="text-xs opacity-75">${timestamp}</p>
            </div>
        `;
        
        container.appendChild(messageDiv);
    });
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// Send message
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const messageText = input.value.trim();
    
    if (!messageText) return;
    
    try {
        await db.collection('messages').add({
            orderId: currentOrderId,
            sender: 'client',
            text: messageText,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            customerEmail: orderData.personalInfo?.email || 'unknown'
        });
        
        input.value = '';
        
    } catch (error) {
        console.error('Error sending message:', error);
        alert('حدث خطأ في إرسال الرسالة. يرجى المحاولة مرة أخرى.');
    }
}

// Show error screen
function showError() {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('errorScreen').classList.remove('hidden');
}

// Hide loading screen
function hideLoading() {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('mainContent').classList.remove('hidden');
}

// Cleanup listeners when page unloads
window.addEventListener('beforeunload', function() {
    if (messagesListener) {
        messagesListener();
    }
});

