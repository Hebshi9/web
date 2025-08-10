# منصة سلس - دليل الإعداد

## نظرة عامة
منصة سلس هي منصة احترافية لخدمات السير الذاتية والاستشارات المهنية في المملكة العربية السعودية.

## الروابط المهمة
- **الموقع الرئيسي**: https://ftefrmqv.manus.space
- **لوحة التحكم الإدارية**: https://ftefrmqv.manus.space/admin.html
- **بوابة العميل**: https://ftefrmqv.manus.space/order.html?id=ORDER_ID

## إعداد Firebase

### الخطوة 1: إنشاء مشروع Firebase
1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. انقر على "إضافة مشروع" أو "Add project"
3. أدخل اسم المشروع (مثل: sals-platform)
4. اتبع الخطوات لإنشاء المشروع

### الخطوة 2: إعداد Firestore Database
1. في لوحة تحكم Firebase، اذهب إلى "Firestore Database"
2. انقر على "إنشاء قاعدة بيانات" أو "Create database"
3. اختر "Start in test mode" للبداية
4. اختر المنطقة الأقرب (مثل: europe-west3)

### الخطوة 3: إعداد Firebase Storage
1. اذهب إلى "Storage" في لوحة التحكم
2. انقر على "البدء" أو "Get started"
3. اختر نفس المنطقة المستخدمة في Firestore

### الخطوة 4: الحصول على إعدادات المشروع
1. اذهب إلى "Project Settings" (إعدادات المشروع)
2. انتقل إلى تبويب "General"
3. في قسم "Your apps"، انقر على "Add app" واختر "Web"
4. أدخل اسم التطبيق (مثل: Sals Platform)
5. انسخ إعدادات Firebase Config

### الخطوة 5: تحديث إعدادات Firebase في الموقع
1. افتح ملف `js/firebase-config.js`
2. استبدل الإعدادات الموجودة بإعداداتك:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-actual-sender-id",
    appId: "your-actual-app-id"
};
```

### الخطوة 6: إعداد قواعد الأمان
#### قواعد Firestore:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Orders collection
    match /orders/{document} {
      allow read, write: if true; // للاختبار فقط - يجب تحسين الأمان لاحقاً
    }
    
    // Customers collection
    match /customers/{document} {
      allow read, write: if true;
    }
    
    // Team collection
    match /team/{document} {
      allow read, write: if true;
    }
    
    // Discounts collection
    match /discounts/{document} {
      allow read, write: if true;
    }
    
    // Messages collection
    match /messages/{document} {
      allow read, write: if true;
    }
  }
}
```

#### قواعد Storage:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true; // للاختبار فقط
    }
  }
}
```

## معلومات تسجيل الدخول للوحة التحكم

### حسابات الإدارة الافتراضية:
- **المدير الرئيسي**: 
  - اسم المستخدم: `admin`
  - كلمة المرور: `sals2024`

- **المدير**: 
  - اسم المستخدم: `manager`
  - كلمة المرور: `manager123`

- **المشرف**: 
  - اسم المستخدم: `supervisor`
  - كلمة المرور: `super456`

## كوبونات الخصم الافتراضية
- `WELCOME20` - خصم 20%
- `STUDENT15` - خصم 15%
- `FIRST10` - خصم 10%
- `VIP25` - خصم 25%

## الميزات الرئيسية

### الصفحة الرئيسية
- تحليل السيرة الذاتية بالذكاء الاصطناعي
- عرض الباقات والخدمات
- نظام الطلبات المتقدم مع الخدمات الإضافية
- كوبونات الخصم
- تكامل واتساب

### بوابة العميل
- تتبع حالة الطلب
- خط زمني للتقدم
- نظام المراسلة المباشرة
- مكتبة الموارد

### لوحة التحكم الإدارية
- نظرة عامة على الإحصائيات
- إدارة الطلبات والعملاء
- إدارة الفريق
- إدارة كوبونات الخصم
- التقارير المالية

## الدعم الفني
- واتساب: +966503678789
- البريد الإلكتروني: info@sals.sa

## ملاحظات مهمة
1. يجب تحديث إعدادات Firebase قبل استخدام الموقع
2. يُنصح بتحسين قواعد الأمان قبل الإطلاق الرسمي
3. يمكن تخصيص التصميم والألوان حسب الحاجة
4. جميع النصوص باللغة العربية ومتوافقة مع الاتجاه من اليمين لليسار

