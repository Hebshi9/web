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

const API_BASE = '';

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
        loadDashboardData().then(() => {
            showSection('overview');
        });
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
    const sectionEl = document.getElementById(sectionName + '-section');
    if (sectionEl) sectionEl.classList.remove('hidden');
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('bg-sals-primary', 'text-white');
    });
    if (event && event.target) {
        event.target.classList.add('bg-sals-primary', 'text-white');
    }
    
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
        const ordersResponse = await fetch(`${API_BASE}/api/orders`);
        const ordersData = await ordersResponse.json();
        allOrders = ordersData.orders || [];
        
        // Load customers
        const customersResponse = await fetch(`${API_BASE}/api/customers`);
        allCustomers = await customersResponse.json();
        
        // Load team
        const teamResponse = await fetch(`${API_BASE}/api/team`);
        teamMembers = await teamResponse.json();
        
        // Load discounts
        const discountsResponse = await fetch(`${API_BASE}/api/discounts`);
        discountCodes = await discountsResponse.json();
        
        console.log('Dashboard data loaded:', { orders: allOrders.length, customers: allCustomers.length, team: teamMembers.length, discounts: discountCodes.length });
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        alert('حدث خطأ في تحميل البيانات');
    }
}

// Overview section
function loadOverviewData() {
    // Calculate stats
    const totalOrders = allOrders.length;
    const totalRevenue = allOrders.reduce((sum, order) => sum + (Number(order.totalPrice) || 0), 0);
    const totalCustomers = allCustomers.length;
    const pendingOrders = allOrders.filter(order => order.status === 'قيد التنفيذ' || order.status === 'جديد').length;
    
    // Update stats cards
    document.getElementById('totalOrders').textContent = totalOrders;
    document.getElementById('totalRevenue').textContent = `${totalRevenue.toLocaleString()} ر.س`;
    document.getElementById('totalCustomers').textContent = totalCustomers;
    document.getElementById('pendingOrders').textContent = pendingOrders;
    
    // Load recent orders
    const recentOrders = allOrders
        .slice(-5)
        .reverse();
    
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
        
        const createdDate = order.createdAt ?
            new Date(order.createdAt).toLocaleDateString('ar-SA') : 
            'غير محدد';
        
        const assignedMember = teamMembers.find(member => member.id === order.assignedTo);
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${order.id ? order.id.substring(0, 8) + '...' : 'غير محدد'}
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
    const createdDate = order.createdAt ?
        new Date(order.createdAt).toLocaleString('ar-SA') : 
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
        const resp = await fetch(`${API_BASE}/api/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, assignedTo, internalNotes })
        });
        if (!resp.ok) throw new Error('Failed to update');
        const { order } = await resp.json();
        
        // Update local data
        const orderIndex = allOrders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            allOrders[orderIndex] = { ...allOrders[orderIndex], ...order };
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
        const resp = await fetch(`${API_BASE}/api/orders/${orderId}`, { method: 'DELETE' });
        if (!resp.ok) throw new Error('Failed to delete');
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
        const lastOrderDate = customer.lastOrderDate ? 
            new Date(customer.lastOrderDate).toLocaleDateString('ar-SA') : 
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
                <button onclick="viewCustomerOrders('${customer.email}')" class="text-sals-primary hover:text-blue-700">
                    <i class="fas fa-eye ml-2"></i>
                    عرض الطلبات
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function viewCustomerOrders(customerEmail) {
    const customer = allCustomers.find(c => c.email === customerEmail);
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
    
    if (teamMembers.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="6" class="text-center py-8 text-gray-500">لا يوجد أعضاء</td>';
        tbody.appendChild(emptyRow);
        return;
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
                <button onclick="promptEditTeamMember('${member.id}')" class="text-green-600 hover:text-green-800 ml-3">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="confirmDeleteTeamMember('${member.id}')" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

async function showAddTeamMemberModal() {
    const name = prompt('اسم العضو:');
    if (!name) return;
    const email = prompt('البريد الإلكتروني:') || '';
    const position = prompt('المنصب:') || '';
    try {
        const resp = await fetch(`${API_BASE}/api/team`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, position, status: 'نشط' })
        });
        if (!resp.ok) throw new Error('create failed');
        const { member } = await resp.json();
        teamMembers.push(member);
        loadTeamData();
    } catch (e) {
        alert('فشل إنشاء العضو');
    }
}

function promptEditTeamMember(memberId) {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;
    const name = prompt('اسم العضو:', member.name) || member.name;
    const email = prompt('البريد الإلكتروني:', member.email) || member.email;
    const position = prompt('المنصب:', member.position) || member.position;
    const status = prompt('الحالة (نشط/غير نشط):', member.status) || member.status;
    updateTeamMember(memberId, { name, email, position, status });
}

async function updateTeamMember(memberId, data) {
    try {
        const resp = await fetch(`${API_BASE}/api/team/${memberId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!resp.ok) throw new Error('update failed');
        const result = await resp.json();
        const idx = teamMembers.findIndex(m => m.id === memberId);
        if (idx !== -1) teamMembers[idx] = result.member;
        loadTeamData();
    } catch (e) {
        alert('فشل تحديث العضو');
    }
}

async function confirmDeleteTeamMember(memberId) {
    if (!confirm('هل أنت متأكد من حذف هذا العضو؟')) return;
    try {
        const resp = await fetch(`${API_BASE}/api/team/${memberId}`, { method: 'DELETE' });
        if (!resp.ok) throw new Error('delete failed');
        teamMembers = teamMembers.filter(m => m.id !== memberId);
        loadTeamData();
    } catch (e) {
        alert('فشل حذف العضو');
    }
}

// Discounts section
function loadDiscountsData() {
    const tbody = document.getElementById('discountsTableBody');
    tbody.innerHTML = '';
    
    if (discountCodes.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="6" class="text-center py-8 text-gray-500">لا توجد كوبونات</td>';
        tbody.appendChild(emptyRow);
        return;
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
                <button onclick="promptEditDiscount('${discount.id}')" class="text-green-600 hover:text-green-800 ml-3">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="confirmDeleteDiscount('${discount.id}')" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

async function showAddDiscountModal() {
    const code = prompt('كود الخصم:');
    if (!code) return;
    const percentage = parseInt(prompt('نسبة الخصم (%):') || '0', 10);
    const expiryDate = prompt('تاريخ الانتهاء (YYYY-MM-DD):') || '';
    try {
        const resp = await fetch(`${API_BASE}/api/discounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, percentage, expiryDate, status: 'نشط' })
        });
        if (!resp.ok) throw new Error('create failed');
        const { discount } = await resp.json();
        discountCodes.push(discount);
        loadDiscountsData();
    } catch (e) {
        alert('فشل إنشاء الكوبون');
    }
}

function promptEditDiscount(discountId) {
    const discount = discountCodes.find(d => d.id === discountId || d.code === discountId);
    if (!discount) return;
    const code = prompt('كود الخصم:', discount.code) || discount.code;
    const percentage = parseInt(prompt('نسبة الخصم (%):', discount.percentage) || discount.percentage, 10);
    const expiryDate = prompt('تاريخ الانتهاء (YYYY-MM-DD):', discount.expiryDate) || discount.expiryDate;
    const status = prompt('الحالة (نشط/متوقف):', discount.status) || discount.status;
    updateDiscount(discountId, { code, percentage, expiryDate, status });
}

async function updateDiscount(discountId, data) {
    try {
        const resp = await fetch(`${API_BASE}/api/discounts/${discountId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!resp.ok) throw new Error('update failed');
        const result = await resp.json();
        const idx = discountCodes.findIndex(d => d.id === discountId || d.code === discountId);
        if (idx !== -1) discountCodes[idx] = result.discount;
        loadDiscountsData();
    } catch (e) {
        alert('فشل تحديث الكوبون');
    }
}

async function confirmDeleteDiscount(discountId) {
    if (!confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;
    try {
        const resp = await fetch(`${API_BASE}/api/discounts/${discountId}`, { method: 'DELETE' });
        if (!resp.ok) throw new Error('delete failed');
        discountCodes = discountCodes.filter(d => d.id !== discountId && d.code !== discountId);
        loadDiscountsData();
    } catch (e) {
        alert('فشل حذف الكوبون');
    }
}

// Reports section
async function loadReportsData() {
    try {
        const resp = await fetch(`${API_BASE}/api/stats`);
        const stats = await resp.json();
        
        // Revenue Chart
        const revenueCtx = document.getElementById('revenueChart').getContext('2d');
        const labels = Object.keys(stats.revenue_by_month || {});
        const revenueData = Object.values(stats.revenue_by_month || {});
        
        new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels,
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
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
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
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
    } catch (e) {
        console.error('Failed to load reports', e);
    }
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

function editOrder(orderId) {
    viewOrderDetails(orderId);
}

