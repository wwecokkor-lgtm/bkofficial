import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, 
  query, where, orderBy, getDoc, limit, setDoc, documentId, arrayUnion, increment, writeBatch, onSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { Course, NewsPost, Exam, Question, Coupon, ExamResult, UserProfile, Section, SearchResult, Certificate, ActivityLog, Review, Enrollment, Transaction, SiteConfig, Slide, Popup, MediaFile, StorageStats, Comment, Interaction, FAQ, ContactMessage, SupportTicket, PaymentRequest, PaymentMethod, UserRole, UserLog, AccountStatus, DiscountCampaign, DiscountClaim, SoundAsset, Notification } from './types';
import { mediaStorage } from './mediaStorage';
import { GoogleGenAI } from "@google/genai";

// AI Configuration
const API_KEY = "AIzaSyDEodvBzYo_uTlzOtTs74-DuXZe47G8k_0"; 
const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- UTILITIES ---

// Robust YouTube ID Extractor
export const getYoutubeId = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// --- DEFAULT CONFIGURATION (Fallback) ---
const DEFAULT_CONFIG: SiteConfig = {
  id: 'config',
  siteName: 'BK Academy',
  siteDescription: 'Professional LMS Platform',
  logos: {
    desktop: '',
    mobile: '',
    favicon: '',
    footer: ''
  },
  theme: {
    primaryColor: '#2563eb',
    secondaryColor: '#1e293b',
    fontFamily: 'Hind Siliguri',
    darkModeDefault: false,
    borderRadius: 'md'
  },
  features: {
    registration: true,
    login: true,
    courses: true,
    exams: true,
    blog: true,
    maintenance: false,
    comments: true,
    reviews: true
  },
  sections: {
    hero: true,
    featuredCourses: true,
    news: true,
    exams: true,
    testimonials: true
  },
  announcement: {
    enabled: true,
    text: 'Welcome to BK Academy',
    link: '',
    bgColor: '#000000',
    textColor: '#ffffff'
  },
  contact: {
    phone: '+8801700000000',
    email: 'info@bkacademy.com',
    address: 'Dhaka, Bangladesh',
    social: { fb: '', yt: '', tw: '', li: '' }
  }
};

// --- REAL-TIME NOTIFICATIONS SYSTEM ---

export const subscribeToNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
  const q = query(
    collection(db, 'notifications'), 
    where('userId', '==', userId), 
    orderBy('timestamp', 'desc'), 
    limit(20)
  );

  return onSnapshot(q, (snapshot) => {
    const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
    callback(notes);
  });
};

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const noteRef = doc(db, 'notifications', notificationId);
    await updateDoc(noteRef, { isRead: true });
  } catch (e) {
    console.error("Error marking notification read", e);
  }
};

export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', userId), 
      where('isRead', '==', false)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { isRead: true });
    });
    
    await batch.commit();
  } catch (e) {
    console.error("Error marking all read", e);
  }
};

export const sendNotification = async (userId: string, notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      ...notification,
      userId,
      isRead: false,
      timestamp: Date.now()
    });
  } catch (e) {
    console.error("Error sending notification", e);
  }
};

// --- SOUND SYSTEM ---

export const getSoundAssets = async (): Promise<SoundAsset[]> => {
  try {
    const s = await getDocs(collection(db, 'sound_assets'));
    return s.docs.map(d => ({id: d.id, ...d.data()} as SoundAsset));
  } catch { return []; }
};

export const saveSoundAsset = async (sound: Partial<SoundAsset>) => {
  if (sound.id) {
    await updateDoc(doc(db, 'sound_assets', sound.id), sound);
  } else {
    await addDoc(collection(db, 'sound_assets'), { ...sound, uploadedAt: Date.now() });
  }
};

export const deleteSoundAsset = async (id: string) => deleteDoc(doc(db, 'sound_assets', id));

// --- DISCOUNT & CAMPAIGN SYSTEM ---

export const getActiveCampaigns = async (): Promise<DiscountCampaign[]> => {
  const now = Date.now();
  // Firestore filters are basic, might need client-side filtering for dates if composite index issue arises
  const q = query(collection(db, 'campaigns'), where('isActive', '==', true));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({id: d.id, ...d.data()} as DiscountCampaign))
    .filter(c => c.startDate <= now && c.endDate >= now);
};

export const getAllCampaigns = async (): Promise<DiscountCampaign[]> => {
  const s = await getDocs(query(collection(db, 'campaigns'), orderBy('createdAt', 'desc')));
  return s.docs.map(d => ({id: d.id, ...d.data()} as DiscountCampaign));
};

export const saveCampaign = async (campaign: Partial<DiscountCampaign>) => {
  const data = { ...campaign, createdAt: campaign.createdAt || Date.now() };
  if (campaign.id) {
    await updateDoc(doc(db, 'campaigns', campaign.id), data);
  } else {
    await addDoc(collection(db, 'campaigns'), data);
  }
};

export const deleteCampaign = async (id: string) => deleteDoc(doc(db, 'campaigns', id));

export const getCoupons = async (): Promise<Coupon[]> => {
  const s = await getDocs(collection(db, 'coupons'));
  return s.docs.map(d => ({id: d.id, ...d.data()} as Coupon));
};

export const saveCoupon = async (coupon: Partial<Coupon>) => {
  if (coupon.id) {
    await updateDoc(doc(db, 'coupons', coupon.id), coupon);
  } else {
    await addDoc(collection(db, 'coupons'), coupon);
  }
};

export const deleteCoupon = async (id: string) => deleteDoc(doc(db, 'coupons', id));

export const validateCoupon = async (code: string, courseId: string, price: number): Promise<{valid: boolean, discount: number, message: string}> => {
  try {
    const q = query(collection(db, 'coupons'), where('code', '==', code), where('isActive', '==', true));
    const snap = await getDocs(q);
    
    if (snap.empty) return { valid: false, discount: 0, message: 'Invalid Coupon Code' };
    
    const coupon = { id: snap.docs[0].id, ...snap.docs[0].data() } as Coupon;
    
    if (coupon.expiryDate < Date.now()) return { valid: false, discount: 0, message: 'Coupon Expired' };
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) return { valid: false, discount: 0, message: 'Coupon Limit Reached' };
    if (coupon.minPurchase && price < coupon.minPurchase) return { valid: false, discount: 0, message: `Min purchase ৳${coupon.minPurchase} required` };
    
    // Check applicable courses if restricted
    if (coupon.applicableCourses && coupon.applicableCourses.length > 0 && !coupon.applicableCourses.includes('all')) {
        if (!coupon.applicableCourses.includes(courseId)) {
            return { valid: false, discount: 0, message: 'Coupon not applicable for this course' };
        }
    }

    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = Math.round((price * coupon.value) / 100);
    } else {
      discountAmount = coupon.value;
    }

    return { valid: true, discount: Math.min(discountAmount, price), message: 'Coupon Applied!' };
  } catch (error) {
    console.error(error);
    return { valid: false, discount: 0, message: 'Validation Error' };
  }
};

// Calculate Best Price (Event vs Regular Discount)
export const calculateBestPrice = (course: Course, activeCampaigns: DiscountCampaign[]) => {
  let price = course.discountPrice || course.price;
  let activeEventName = '';

  // Check for applicable campaigns
  const applicable = activeCampaigns.find(c => c.applicableCourses.includes('all') || c.applicableCourses.includes(course.id));
  
  if (applicable) {
    let campaignDiscount = 0;
    if (applicable.type === 'percentage') {
      campaignDiscount = Math.round((course.price * applicable.value) / 100);
    } else {
      campaignDiscount = applicable.value;
    }
    
    const campaignPrice = Math.max(0, course.price - campaignDiscount);
    
    // If campaign offers better price than regular discount
    if (campaignPrice < price) {
      price = campaignPrice;
      activeEventName = applicable.name;
    }
  }

  return { price, activeEventName };
};

// --- USER MANAGEMENT SYSTEM ---

// Log Admin Action
export const logAdminAction = async (adminId: string, action: string, details: string, targetUserId: string) => {
  try {
    const log: UserLog = {
      id: Date.now().toString(),
      userId: targetUserId,
      action,
      details,
      performedBy: adminId,
      timestamp: Date.now()
    };
    await addDoc(collection(db, 'user_logs'), log);
  } catch (error) {
    console.error("Failed to log action", error);
  }
};

// Get Logs for a User
export const getUserLogs = async (userId: string): Promise<UserLog[]> => {
  const q = query(collection(db, 'user_logs'), where('userId', '==', userId), orderBy('timestamp', 'desc'), limit(50));
  const s = await getDocs(q);
  return s.docs.map(d => ({id: d.id, ...d.data()} as UserLog));
};

// Update User Profile with Logging
export const updateAdminUser = async (adminId: string, targetUid: string, data: Partial<UserProfile>) => {
  const ref = doc(db, 'users', targetUid);
  await updateDoc(ref, data);
  
  // Log specific changes
  if (data.role) await logAdminAction(adminId, 'ROLE_CHANGE', `Changed role to ${data.role}`, targetUid);
  if (data.status) await logAdminAction(adminId, 'STATUS_CHANGE', `Changed status to ${data.status}`, targetUid);
  if (data.classLevel) await logAdminAction(adminId, 'CLASS_UPDATE', `Changed class to ${data.classLevel}`, targetUid);
};

// Link Parent and Student
export const linkParentStudent = async (adminId: string, parentId: string, studentId: string) => {
  try {
    const parentRef = doc(db, 'users', parentId);
    const studentRef = doc(db, 'users', studentId);

    await updateDoc(parentRef, { childrenIds: arrayUnion(studentId) });
    await updateDoc(studentRef, { parentId: parentId });

    await logAdminAction(adminId, 'LINK_PARENT', `Linked parent ${parentId} to student ${studentId}`, studentId);
    return true;
  } catch (error) {
    console.error("Linking failed", error);
    return false;
  }
};

// Bulk Actions
export const bulkUserAction = async (adminId: string, userIds: string[], action: 'activate' | 'suspend' | 'delete' | 'verify') => {
  const batch = writeBatch(db);
  
  userIds.forEach(uid => {
    const ref = doc(db, 'users', uid);
    if (action === 'delete') {
      batch.delete(ref);
    } else if (action === 'activate') {
      batch.update(ref, { status: 'active', isBlocked: false });
    } else if (action === 'suspend') {
      batch.update(ref, { status: 'suspended', isBlocked: true });
    } else if (action === 'verify') {
      batch.update(ref, { isVerified: true });
    }
  });

  await batch.commit();
  await logAdminAction(adminId, 'BULK_ACTION', `Performed ${action} on ${userIds.length} users`, 'BULK');
};

// Search Users (Simple Client-Side Logic Helper due to Firestore limitation)
// In a real scalability scenario, use Algolia or Typesense.
export const searchUsers = async (term: string): Promise<UserProfile[]> => {
  // Fetch all and filter (Not ideal for 1M users, but fine for <5k)
  const s = await getDocs(collection(db, 'users'));
  const all = s.docs.map(d => d.data() as UserProfile);
  const lower = term.toLowerCase();
  return all.filter(u => 
    u.displayName.toLowerCase().includes(lower) || 
    u.email.toLowerCase().includes(lower) ||
    u.phone?.includes(lower)
  );
};

// --- MEDIA MANAGEMENT SYSTEM (HYBRID CLOUD + LOCAL) ---

export const uploadMediaFile = async (file: File, folder: string, userId: string): Promise<MediaFile | null> => {
  try {
    const ext = file.name.split('.').pop();
    const storedName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const fullPath = `${folder}/${storedName}`;
    let finalUrl = '';

    // Strategy: Try Firebase Storage (Cloud) first
    // If it fails (offline or quota), fallback to IndexedDB (Local)
    try {
      if (!navigator.onLine) throw new Error("Offline");
      const storageRef = ref(storage, fullPath);
      await uploadBytes(storageRef, file);
      finalUrl = await getDownloadURL(storageRef);
    } catch (cloudError) {
      console.warn("Cloud Upload Failed, falling back to Local Storage:", cloudError);
      finalUrl = await mediaStorage.save(fullPath, file);
    }

    const newFile: MediaFile = {
      id: storedName.split('.')[0],
      originalName: file.name,
      storedName,
      folder,
      fullPath,
      mimeType: file.type,
      size: file.size,
      url: finalUrl,
      uploadedBy: userId,
      uploadedAt: Date.now()
    };

    // Metadata is saved to Firestore (will be queued if offline)
    await addDoc(collection(db, 'media_files'), newFile);
    return newFile;
  } catch (error) {
    console.error("Upload Failed completely:", error);
    alert("Upload failed. Please check storage.");
    return null;
  }
};

export const getMediaFiles = async (folder?: string): Promise<MediaFile[]> => {
  try {
    let q = query(collection(db, 'media_files'), orderBy('uploadedAt', 'desc'));
    if (folder && folder !== 'all') {
      q = query(collection(db, 'media_files'), where('folder', '==', folder), orderBy('uploadedAt', 'desc'));
    }
    
    // Firestore cache will handle offline reads automatically
    const snapshot = await getDocs(q);
    const files = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as MediaFile));
    
    // Check if URLs are blob URLs (Local) and if they are expired/invalid, try to refresh from IndexedDB
    const refreshedFiles = await Promise.all(files.map(async (f) => {
      if (f.url.startsWith('blob:')) {
        // Verify blob validity or fetch fresh from IDB
        const exists = await mediaStorage.get(f.fullPath);
        if (exists) return { ...f, url: exists };
        return f; 
      }
      return f;
    }));

    return refreshedFiles;
  } catch (error) {
    console.error("Fetch Media Error:", error);
    return [];
  }
};

export const deleteMediaFile = async (fileId: string, fullPath: string) => {
  try {
    try {
       // Cloud delete requires import, skipping for safety if not used
    } catch(e) {}
    
    await mediaStorage.delete(fullPath);
    await deleteDoc(doc(db, 'media_files', fileId));
    return true;
  } catch (error) {
    console.error("Delete Error:", error);
    return false;
  }
};

export const getStorageAnalytics = async (): Promise<StorageStats> => {
  const { used, count } = await mediaStorage.getStats();
  const total = mediaStorage.maxCapacity;
  return {
    usedBytes: used,
    totalCapacityBytes: total,
    fileCount: count,
    usagePercentage: (used / total) * 100
  };
};

export const uploadFileToLocalServer = async (file: File): Promise<string> => {
  const result = await uploadMediaFile(file, 'uploads', 'system');
  return result ? result.url : '';
};

// --- DATA APIs ---

export const getPaymentMethods = async (): Promise<PaymentMethod[]> => {
  try {
    const q = query(collection(db, 'payment_methods'));
    const s = await getDocs(q);
    if (s.empty) {
      const defaults: PaymentMethod[] = [
        { id: 'bkash', methodName: 'bKash', accountNumber: '01711223344', accountType: 'Merchant', instructions: '*247# Dial', isEnabled: true },
        { id: 'nagad', methodName: 'Nagad', accountNumber: '01911223344', accountType: 'Merchant', instructions: '*167# Dial', isEnabled: true },
      ];
      // Try to seed defaults, but simply ignore if permission fails (non-admin user)
      try {
        for (const m of defaults) await setDoc(doc(db, 'payment_methods', m.id), m);
      } catch (seedErr) {
        console.log("Skipping payment method seed (likely missing permissions). Using defaults locally.");
      }
      return defaults;
    }
    return s.docs.map(d => ({ id: d.id, ...d.data() } as PaymentMethod));
  } catch (e) { 
    console.error("Fetch Payment Methods Failed:", e);
    // Return empty or defaults on fail
    return []; 
  }
};

export const savePaymentMethod = async (method: PaymentMethod) => {
  if (method.id) await setDoc(doc(db, 'payment_methods', method.id), method);
  else await addDoc(collection(db, 'payment_methods'), method);
};

export const submitPaymentRequest = async (payment: Omit<PaymentRequest, 'id' | 'status' | 'submittedAt'>) => {
  await addDoc(collection(db, 'payments'), { ...payment, status: 'pending', submittedAt: Date.now() });
};

export const getPaymentRequests = async (): Promise<PaymentRequest[]> => {
  try { const s = await getDocs(query(collection(db, 'payments'), orderBy('submittedAt', 'desc'))); return s.docs.map(d => ({ id: d.id, ...d.data() } as PaymentRequest)); } catch { return []; }
};

export const processPayment = async (paymentId: string, status: 'approved' | 'rejected', adminNote?: string) => {
  const ref = doc(db, 'payments', paymentId);
  if (status === 'approved') {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data() as PaymentRequest;
      await enrollUserInCourse(d.userId, d.courseId);
    }
  }
  await updateDoc(ref, { status, adminNote, approvedAt: status === 'approved' ? Date.now() : undefined });
};

export const generateCourseDescription = async (title: string, category: string): Promise<string> => "AI Description";
export const suggestCourseOutline = async (title: string, level: string): Promise<Section[]> => [];

export const getSiteConfig = async (): Promise<SiteConfig> => {
  try {
    const d = await getDoc(doc(db, 'site_settings', 'config'));
    if (d.exists()) return d.data() as SiteConfig;
    return DEFAULT_CONFIG;
  } catch (error) {
    console.warn("Failed to load site config (using defaults):", error);
    return DEFAULT_CONFIG; // Prevents undefined errors
  }
};

export const updateSiteConfig = async (c: SiteConfig) => { await setDoc(doc(db, 'site_settings', 'config'), c); return true; };
export const getSlides = async () => { const s = await getDocs(query(collection(db, 'slides'), orderBy('order'))); return s.docs.map(d => ({id:d.id, ...d.data()} as Slide)); };
export const saveSlide = async (s: Slide) => { if(s.id) await updateDoc(doc(db, 'slides', s.id), {...s}); else await addDoc(collection(db, 'slides'), s); };
export const deleteSlide = async (id: string) => deleteDoc(doc(db, 'slides', id));
export const getPopups = async () => { const s = await getDocs(collection(db, 'popups')); return s.docs.map(d => ({id:d.id, ...d.data()} as Popup)); };
export const savePopup = async (p: Popup) => { if(p.id) await updateDoc(doc(db, 'popups', p.id), {...p}); else await addDoc(collection(db, 'popups'), p); };
export const deletePopup = async (id: string) => deleteDoc(doc(db, 'popups', id));
export const searchGlobal = async (term: string): Promise<SearchResult[]> => { return []; };
export const getCourses = async (): Promise<Course[]> => { const s = await getDocs(collection(db, 'courses')); return s.docs.map(d => ({id:d.id, ...d.data()} as Course)); };
export const getCourseById = async (id: string) => { const d = await getDoc(doc(db, 'courses', id)); return d.exists() ? {id:d.id, ...d.data()} as Course : null; };
export const getEnrolledCourses = async (ids: string[]) => { if(!ids.length) return []; const all = await getCourses(); return all.filter(c => ids.includes(c.id)); };
export const addCourse = async (c: any) => addDoc(collection(db, 'courses'), {...c, createdAt: Date.now()});
export const updateCourse = async (id: string, d: any) => updateDoc(doc(db, 'courses', id), d);
export const deleteCourse = async (id: string) => deleteDoc(doc(db, 'courses', id));
export const enrollUserInCourse = async (uid: string, cid: string) => { await setDoc(doc(db, 'enrollments', `${cid}_${uid}`), {id:`${cid}_${uid}`, userId:uid, courseId:cid, enrolledAt:Date.now(), completedLessons:[], progress:0, isCompleted:false}); await updateDoc(doc(db, 'users', uid), {enrolledCourses: arrayUnion(cid)}); return true; };
export const getEnrollment = async (uid: string, cid: string) => { const d = await getDoc(doc(db, 'enrollments', `${cid}_${uid}`)); return d.exists() ? d.data() as Enrollment : null; };
export const updateLessonProgress = async (uid: string, cid: string, lid: string, total: number) => { 
    const ref = doc(db, 'enrollments', `${cid}_${uid}`);
    await updateDoc(ref, { completedLessons: arrayUnion(lid), lastWatchedLessonId: lid });
    // Recalc progress
    const snap = await getDoc(ref);
    if(snap.exists()) {
        const len = snap.data().completedLessons.length;
        await updateDoc(ref, { progress: Math.round((len/total)*100) });
    }
};
export const getComments = async (lid: string) => { const q = query(collection(db, 'comments'), where('lessonId','==',lid)); const s = await getDocs(q); return s.docs.map(d => ({id:d.id, ...d.data()} as Comment)); };
export const addComment = async (c: any) => { await addDoc(collection(db, 'comments'), {...c, timestamp: Date.now()}); return true; };
export const toggleLike = async (uid: string, tid: string, type: string, count: number) => {};
export const checkIsLiked = async (uid: string, tid: string, type: string) => false;
export const getCourseReviews = async (cid: string) => { const q = query(collection(db, 'reviews'), where('courseId','==',cid)); const s = await getDocs(q); return s.docs.map(d => ({id:d.id, ...d.data()} as Review)); };
export const submitReview = async (r: any) => { await addDoc(collection(db, 'reviews'), r); };
export const getDashboardStats = async () => ({totalUsers:0, totalCourses:0, totalExams:0, totalRevenue:0});
export const getNews = async (category?: string) => { 
  let q = query(collection(db, 'news'), orderBy('timestamp', 'desc'));
  if(category && category !== 'All') {
    q = query(collection(db, 'news'), where('category', '==', category), orderBy('timestamp', 'desc'));
  }
  const s = await getDocs(q); 
  return s.docs.map(d => ({id:d.id, ...d.data()} as NewsPost)); 
};
export const addNews = async (n: any) => { await addDoc(collection(db, 'news'), n); };
export const updateNews = async (id: string, n: Partial<NewsPost>) => { await updateDoc(doc(db, 'news', id), n); };
export const deleteNews = async (id: string) => { await deleteDoc(doc(db, 'news', id)); };
export const togglePinNews = async (id: string, p: boolean) => updateDoc(doc(db, 'news', id), {isPinned:p});
export const incrementNewsView = async (id: string) => updateDoc(doc(db, 'news', id), {views: increment(1)});
export const getExams = async () => { const s = await getDocs(collection(db, 'exams')); return s.docs.map(d => ({id:d.id, ...d.data()} as Exam)); };
export const createExam = async (e: any) => { await addDoc(collection(db, 'exams'), e); };
export const submitExamResult = async (r: any) => { await addDoc(collection(db, 'results'), r); };
export const getUserExamHistory = async (uid: string) => { const s = await getDocs(query(collection(db, 'results'), where('userId','==',uid))); return s.docs.map(d => ({id:d.id, ...d.data()} as ExamResult)); };
export const getAllUsers = async () => { const s = await getDocs(collection(db, 'users')); return s.docs.map(d => d.data() as UserProfile); };
export const getUserActivities = async (uid: string) => [];
export const getUserCertificates = async (uid: string) => [];
export const getFAQs = async () => { const s = await getDocs(collection(db, 'faqs')); return s.docs.map(d => ({id:d.id, ...d.data()} as FAQ)); };
export const addFAQ = async (f: any) => { await addDoc(collection(db, 'faqs'), f); };
export const deleteFAQ = async (id: string) => deleteDoc(doc(db, 'faqs', id));
export const toggleFAQHelpful = async (id: string) => updateDoc(doc(db, 'faqs', id), {helpfulCount: increment(1)});
export const submitTicket = async (t: any) => { await addDoc(collection(db, 'tickets'), {...t, status:'Open', createdAt: Date.now()}); };
export const getUserTickets = async (uid: string) => { const s = await getDocs(query(collection(db, 'tickets'), where('userId','==',uid))); return s.docs.map(d => ({id:d.id, ...d.data()} as SupportTicket)); };
export const sendContactMessage = async (m: any) => { await addDoc(collection(db, 'messages'), {...m, createdAt: Date.now()}); };