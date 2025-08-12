// Admin credentials (in production, this should be more secure)
const adminCredentials = {
    'admin': 'sals2024',
    'manager': 'manager123',
    'supervisor': 'super456'
};

// Global variables
let currentUser = null;
let allOrders = [];
let allCustomers = [];
let teamMembers = [];
let discountCodes = [];

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    initializeLogin();
    initializeSidebar();
});

// Login functionality
function initializeLogin() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    if (adminCredentials[username] && adminCredentials[username] === password) {
        currentUser = username;
        document.getElementById('adminName').textContent = username;
        document.getElementById('loginModal').classList.remove('show');
        document.getElementById('dashboard').classList.remove('hidden');
        
        // Load initial data
        loadDashboardData();
        showSection('overview');
    } else {
        errorDiv.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
        errorDiv.classList.remove('hidden');
    }
}

function logout() {
    currentUser = null;
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('loginModal').classList.add('show');
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').classList.add('hidden');
}

// Sidebar functionality
function initializeSidebar() {
    document.getElementById('sidebarToggle').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('hidden');
    });
}

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    document.getElementById(sectionName + '-section').classList.remove('hidden');
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('bg-sals-primary', 'text-white');
    });
    event.target.classList.add('bg-sals-primary', 'text-white');
    
    // Load section-specific data
    switch(sectionName) {
        case 'overview':
            loadOverviewData();
            break;
        case 'orders':
            loadOrdersData();
            break;
        case 'customers':
            loadCustomersData();
            break;
        case 'team':
            loadTeamData();
            break;
        case 'discounts':
            loadDiscountsData();
            break;
        case 'reports':
            loadReportsData();
            break;
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load orders
        const ordersResponse = await fetch(api('/api/orders'));
        const ordersData = await ordersResponse.json();
        allOrders = ordersData.orders || [];
        
        // Load customers
        const customersResponse = await fetch(api('/api/customers'));
        allCustomers = await customersResponse.json();
        
        // Initialize empty arrays for team and discounts (can be expanded later)
        teamMembers = [];
        discountCodes = [];
        
        console.log('Dashboard data loaded:', { orders: allOrders.length, customers: allCustomers.length });
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        alert('حدث خطأ في تحميل البيانات');
    }
}

// Overview section
function loadOverviewData() {
    // Calculate stats
    const totalOrders = allOrders.length;
    const totalRevenue = allOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const totalCustomers = allCustomers.length;
    const pendingOrders = allOrders.filter(order => order.status === 'قيد التنفيذ').length;
    
    // Update stats cards
    document.getElementById('totalOrders').textContent = totalOrders;
    document.getElementById('totalRevenue').textContent = `${totalRevenue.toLocaleString()} ر.س`;
    document.getElementById('totalCustomers').textContent = totalCustomers;
    document.getElementById('pendingOrders').textContent = pendingOrders;
    
    // Load recent orders
    const recentOrders = allOrders
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 5);
    
    const recentOrdersList = document.getElementById('recentOrdersList');
    recentOrdersList.innerHTML = '';
    
    if (recentOrders.length === 0) {
        recentOrdersList.innerHTML = '<p class="text-gray-500 text-center">لا توجد طلبات حتى الآن</p>';
        return;
    }
    
    recentOrders.forEach(order => {
        const orderDiv = document.createElement('div');
        orderDiv.className = 'flex justify-between items-center py-3 border-b last:border-b-0';
        orderDiv.innerHTML = `
            <div>
                <p class="font-medium">${order.personalInfo?.fullName || 'غير محدد'}</p>
                <p class="text-sm text-gray-600">${order.packageName || 'غير محدد'}</p>
            </div>
            <div class="text-left">
                <p class="font-bold">${order.totalPrice || 0} ر.س</p>
                <span class="status-badge status-${getStatusClass(order.status)}">${order.status || 'غير محدد'}</span>
            </div>
        `;
        recentOrdersList.appendChild(orderDiv);
    });
}

// Orders section
function loadOrdersData() {
    loadTeamMembersToFilter();
    displayOrders(allOrders);
}

function loadTeamMembersToFilter() {
    const assigneeFilter = document.getElementById('assigneeFilter');
    assigneeFilter.innerHTML = '<option value="">جميع المسؤولين</option>';
    
    teamMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.name;
        assigneeFilter.appendChild(option);
    });
}

function displayOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = '';
    
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-500">لا توجد طلبات</td></tr>';
        return;
    }
    
    orders.forEach(order => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const createdDate = order.createdAt?.toDate ? 
            order.createdAt.toDate().toLocaleDateString('ar-SA') : 
            'غير محدد';
        
        const assignedMember = teamMembers.find(member => member.id === order.assignedTo);
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${order.id.substring(0, 8)}...
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div>
                    <div class="text-sm font-medium text-gray-900">${order.personalInfo?.fullName || 'غير محدد'}</div>
                    <div class="text-sm text-gray-500">${order.personalInfo?.email || 'غير محدد'}</div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${order.packageName || 'غير محدد'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${order.totalPrice || 0} ر.س
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="status-badge status-${getStatusClass(order.status)}">${order.status || 'غير محدد'}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${assignedMember?.name || 'غير مسند'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${createdDate}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="viewOrderDetails('${order.id}')" class="text-sals-primary hover:text-blue-700 ml-3">
                    <i class="fas fa-eye"></i>
                </button>
                <button onclick="editOrder('${order.id}')" class="text-green-600 hover:text-green-800 ml-3">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteOrder('${order.id}')" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function filterOrders() {
    const statusFilter = document.getElementById('statusFilter').value;
    const packageFilter = document.getElementById('packageFilter').value;
    const assigneeFilter = document.getElementById('assigneeFilter').value;
    const searchFilter = document.getElementById('searchFilter').value.toLowerCase();
    
    let filteredOrders = allOrders.filter(order => {
        const matchesStatus = !statusFilter || order.status === statusFilter;
        const matchesPackage = !packageFilter || order.package === packageFilter;
        const matchesAssignee = !assigneeFilter || order.assignedTo === assigneeFilter;
        const matchesSearch = !searchFilter || 
            (order.personalInfo?.fullName || '').toLowerCase().includes(searchFilter) ||
            (order.personalInfo?.email || '').toLowerCase().includes(searchFilter);
        
        return matchesStatus && matchesPackage && matchesAssignee && matchesSearch;
    });
    
    displayOrders(filteredOrders);
}

function refreshOrders() {
    loadDashboardData().then(() => {
        loadOrdersData();
    });
}

function viewOrderDetails(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const modal = document.getElementById('orderDetailsModal');
    const content = document.getElementById('orderDetailsContent');
    
    const assignedMember = teamMembers.find(member => member.id === order.assignedTo);
    const createdDate = order.createdAt?.toDate ? 
        order.createdAt.toDate().toLocaleString('ar-SA') : 
        'غير محدد';
    
    content.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
                <h4 class="text-lg font-bold text-gray-800 mb-4">معلومات الطلب</h4>
                <div class="space-y-3">
                    <div><strong>رقم الطلب:</strong> ${order.id}</div>
                    <div><strong>الباقة:</strong> ${order.packageName || 'غير محدد'}</div>
                    <div><strong>السعر الأساسي:</strong> ${order.basePrice || 0} ر.س</div>
                    <div><strong>المجموع الكلي:</strong> ${order.totalPrice || 0} ر.س</div>
                    <div><strong>كود الخصم:</strong> ${order.discountCode || 'لا يوجد'}</div>
                    <div><strong>نسبة الخصم:</strong> ${order.discountPercentage || 0}%</div>
                    <div><strong>تاريخ الإنشاء:</strong> ${createdDate}</div>
                </div>
                
                <h5 class="text-md font-bold text-gray-800 mt-6 mb-3">الخدمات الإضافية</h5>
                <div class="space-y-2">
                    <div>خطاب التغطية: ${order.upsellServices?.coverLetter ? 'نعم' : 'لا'}</div>
                    <div>محاكاة المقابلة: ${order.upsellServices?.interviewPrep ? 'نعم' : 'لا'}</div>
                </div>
            </div>
            
            <div>
                <h4 class="text-lg font-bold text-gray-800 mb-4">معلومات العميل</h4>
                <div class="space-y-3">
                    <div><strong>الاسم:</strong> ${order.personalInfo?.fullName || 'غير محدد'}</div>
                    <div><strong>البريد الإلكتروني:</strong> ${order.personalInfo?.email || 'غير محدد'}</div>
                    <div><strong>رقم الجوال:</strong> ${order.personalInfo?.phone || 'غير محدد'}</div>
                </div>
                
                <h5 class="text-md font-bold text-gray-800 mt-6 mb-3">الأهداف المهنية</h5>
                <div class="space-y-3">
                    <div><strong>الشركات المستهدفة:</strong> ${order.goals?.dreamCompanies || 'غير محدد'}</div>
                    <div><strong>المنصب المستهدف:</strong> ${order.goals?.targetPosition || 'غير محدد'}</div>
                    <div><strong>الإنجازات:</strong> ${order.goals?.achievements || 'غير محدد'}</div>
                </div>
            </div>
        </div>
        
        <div class="mt-6 pt-6 border-t">
            <h4 class="text-lg font-bold text-gray-800 mb-4">إدارة الطلب</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">حالة الطلب</label>
                    <select id="orderStatus" class="w-full p-2 border rounded-lg">
                        <option value="جديد" ${order.status === 'جديد' ? 'selected' : ''}>جديد</option>
                        <option value="قيد التنفيذ" ${order.status === 'قيد التنفيذ' ? 'selected' : ''}>قيد التنفيذ</option>
                        <option value="مكتمل" ${order.status === 'مكتمل' ? 'selected' : ''}>مكتمل</option>
                        <option value="ملغي" ${order.status === 'ملغي' ? 'selected' : ''}>ملغي</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">المسؤول</label>
                    <select id="orderAssignee" class="w-full p-2 border rounded-lg">
                        <option value="">غير مسند</option>
                        ${teamMembers.map(member => 
                            `<option value="${member.id}" ${order.assignedTo === member.id ? 'selected' : ''}>${member.name}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="flex items-end">
                    <button onclick="updateOrder('${order.id}')" class="w-full bg-sals-primary text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                        تحديث الطلب
                    </button>
                </div>
            </div>
            
            <div class="mt-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">ملاحظات داخلية</label>
                <textarea id="orderNotes" rows="3" class="w-full p-3 border rounded-lg" placeholder="إضافة ملاحظات...">${order.internalNotes || ''}</textarea>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
}

function closeOrderDetailsModal() {
    document.getElementById('orderDetailsModal').classList.remove('show');
}

async function updateOrder(orderId) {
    const status = document.getElementById('orderStatus').value;
    const assignedTo = document.getElementById('orderAssignee').value;
    const internalNotes = document.getElementById('orderNotes').value;
    
    try {
        await db.collection('orders').doc(orderId).update({
            status: status,
            assignedTo: assignedTo,
            internalNotes: internalNotes,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update local data
        const orderIndex = allOrders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            allOrders[orderIndex].status = status;
            allOrders[orderIndex].assignedTo = assignedTo;
            allOrders[orderIndex].internalNotes = internalNotes;
        }
        
        alert('تم تحديث الطلب بنجاح');
        closeOrderDetailsModal();
        displayOrders(allOrders);
        
    } catch (error) {
        console.error('Error updating order:', error);
        alert('حدث خطأ في تحديث الطلب');
    }
}

async function deleteOrder(orderId) {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
    
    try {
        await db.collection('orders').doc(orderId).delete();
        allOrders = allOrders.filter(o => o.id !== orderId);
        displayOrders(allOrders);
        alert('تم حذف الطلب بنجاح');
    } catch (error) {
        console.error('Error deleting order:', error);
        alert('حدث خطأ في حذف الطلب');
    }
}

// Customers section
function loadCustomersData() {
    const tbody = document.getElementById('customersTableBody');
    tbody.innerHTML = '';
    
    if (allCustomers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">لا يوجد عملاء</td></tr>';
        return;
    }
    
    allCustomers.forEach(customer => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const orderCount = customer.orders?.length || 0;
        const lastOrderDate = customer.lastOrderDate?.toDate ? 
            customer.lastOrderDate.toDate().toLocaleDateString('ar-SA') : 
            'غير محدد';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${customer.fullName || 'غير محدد'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${customer.email || 'غير محدد'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${customer.phone || 'غير محدد'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${orderCount}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${lastOrderDate}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="viewCustomerOrders('${customer.id}')" class="text-sals-primary hover:text-blue-700">
                    <i class="fas fa-eye ml-2"></i>
                    عرض الطلبات
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function viewCustomerOrders(customerId) {
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer || !customer.orders) return;
    
    const customerOrders = allOrders.filter(order => 
        customer.orders.includes(order.id)
    );
    
    alert(`عدد طلبات ${customer.fullName}: ${customerOrders.length}`);
}

// Team section
function loadTeamData() {
    const tbody = document.getElementById('teamTableBody');
    tbody.innerHTML = '';
    
    // Add default team members if none exist
    if (teamMembers.length === 0) {
        const defaultMembers = [
            { id: 'member1', name: 'أحمد محمد', email: 'ahmed@sals.sa', position: 'كاتب سير ذاتية', status: 'نشط' },
            { id: 'member2', name: 'فاطمة العلي', email: 'fatima@sals.sa', position: 'مستشارة مهنية', status: 'نشط' },
            { id: 'member3', name: 'خالد السعد', email: 'khalid@sals.sa', position: 'مدير المشاريع', status: 'نشط' }
        ];
        
        teamMembers = defaultMembers;
        
        // Save to Firebase
        defaultMembers.forEach(async (member) => {
            try {
                await db.collection('team').doc(member.id).set(member);
            } catch (error) {
                console.error('Error adding team member:', error);
            }
        });
    }
    
    teamMembers.forEach(member => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const assignedOrders = allOrders.filter(order => order.assignedTo === member.id).length;
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${member.name}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${member.email}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${member.position}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${assignedOrders}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="status-badge ${member.status === 'نشط' ? 'status-completed' : 'status-cancelled'}">
                    ${member.status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="editTeamMember('${member.id}')" class="text-green-600 hover:text-green-800 ml-3">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteTeamMember('${member.id}')" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Discounts section
function loadDiscountsData() {
    const tbody = document.getElementById('discountsTableBody');
    tbody.innerHTML = '';
    
    // Add default discount codes if none exist
    if (discountCodes.length === 0) {
        const defaultDiscounts = [
            { id: 'WELCOME20', code: 'WELCOME20', percentage: 20, usageCount: 0, expiryDate: '2024-12-31', status: 'نشط' },
            { id: 'STUDENT15', code: 'STUDENT15', percentage: 15, usageCount: 0, expiryDate: '2024-12-31', status: 'نشط' },
            { id: 'FIRST10', code: 'FIRST10', percentage: 10, usageCount: 0, expiryDate: '2024-12-31', status: 'نشط' },
            { id: 'VIP25', code: 'VIP25', percentage: 25, usageCount: 0, expiryDate: '2024-12-31', status: 'نشط' }
        ];
        
        discountCodes = defaultDiscounts;
        
        // Save to Firebase
        defaultDiscounts.forEach(async (discount) => {
            try {
                await db.collection('discounts').doc(discount.id).set(discount);
            } catch (error) {
                console.error('Error adding discount:', error);
            }
        });
    }
    
    discountCodes.forEach(discount => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${discount.code}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${discount.percentage}%
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${discount.usageCount || 0}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${discount.expiryDate}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="status-badge ${discount.status === 'نشط' ? 'status-completed' : 'status-cancelled'}">
                    ${discount.status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="editDiscount('${discount.id}')" class="text-green-600 hover:text-green-800 ml-3">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteDiscount('${discount.id}')" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Reports section
function loadReportsData() {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    
    // Generate sample revenue data
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
    const revenueData = [5000, 7500, 12000, 8500, 15000, 18000];
    
    new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'الإيرادات (ر.س)',
                data: revenueData,
                borderColor: '#1e40af',
                backgroundColor: 'rgba(30, 64, 175, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Packages Chart
    const packagesCtx = document.getElementById('packagesChart').getContext('2d');
    
    const packageCounts = {
        'basic': allOrders.filter(o => o.package === 'basic').length,
        'premium': allOrders.filter(o => o.package === 'premium').length,
        'vip': allOrders.filter(o => o.package === 'vip').length
    };
    
    new Chart(packagesCtx, {
        type: 'doughnut',
        data: {
            labels: ['الباقة الأساسية', 'الباقة المتقدمة', 'باقة VIP'],
            datasets: [{
                data: [packageCounts.basic, packageCounts.premium, packageCounts.vip],
                backgroundColor: ['#3b82f6', '#f59e0b', '#10b981']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Utility functions
function getStatusClass(status) {
    switch(status) {
        case 'جديد': return 'new';
        case 'قيد التنفيذ': return 'progress';
        case 'مكتمل': return 'completed';
        case 'ملغي': return 'cancelled';
        default: return 'new';
    }
}

// Placeholder functions for modals and actions
function showAddTeamMemberModal() {
    alert('إضافة عضو فريق جديد - سيتم تطوير هذه الميزة قريباً');
}

function showAddDiscountModal() {
    alert('إضافة كوبون خصم جديد - سيتم تطوير هذه الميزة قريباً');
}

function editTeamMember(memberId) {
    alert('تعديل عضو الفريق - سيتم تطوير هذه الميزة قريباً');
}

function deleteTeamMember(memberId) {
    if (confirm('هل أنت متأكد من حذف هذا العضو؟')) {
        alert('تم حذف العضو - سيتم تطوير هذه الميزة قريباً');
    }
}

function editDiscount(discountId) {
    alert('تعديل كوبون الخصم - سيتم تطوير هذه الميزة قريباً');
}

function deleteDiscount(discountId) {
    if (confirm('هل أنت متأكد من حذف هذا الكوبون؟')) {
        alert('تم حذف الكوبون - سيتم تطوير هذه الميزة قريباً');
    }
}

function editOrder(orderId) {
    viewOrderDetails(orderId);
}

