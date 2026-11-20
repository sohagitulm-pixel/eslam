import { User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  BirthdayExperience,
  BirthdayWish,
  ContentReport,
  FutureLetterSecret,
  Language,
  PlatformSettings,
  UserProfile,
} from '../types/birthday';

export const ADMIN_EMAIL = 'sohag.itulm@gmail.com';

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  maxPhotosPerExperience: 15,
  maxFileSizeMb: 5,
  maxStoragePerUserMb: 25,
  moderationRequiredDefault: false,
  maintenanceMode: false,
};

export async function syncUserProfile(user: FirebaseUser, preferredLang: Language): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  try {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Creator',
        photoURL: user.photoURL || '',
        language: preferredLang,
        role: 'user',
        storageUsedBytes: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, profile);
      return profile;
    }
    return snap.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfileLang(uid: string, language: Language, displayName?: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    const ref = doc(db, 'users', uid);
    const payload: Record<string, unknown> = {
      language,
      updatedAt: serverTimestamp(),
    };
    if (displayName) payload.displayName = displayName.slice(0, 120);
    await updateDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveExperience(exp: BirthdayExperience, isNew: boolean): Promise<void> {
  const path = `experiences/${exp.id}`;
  try {
    const ref = doc(db, 'experiences', exp.id);
    const cleanPayload: Record<string, unknown> = {
      id: exp.id,
      ownerId: exp.ownerId,
      title: exp.title.slice(0, 160),
      recipientName: exp.recipientName.slice(0, 100),
      recipientAge: (exp.recipientAge || '').slice(0, 16),
      relationship: (exp.relationship || 'friend').slice(0, 64),
      birthdayDate: (exp.birthdayDate || '').slice(0, 32),
      language: exp.language,
      templateId: exp.templateId,
      visibility: exp.visibility,
      published: Boolean(exp.published),
      passcodeEnabled: Boolean(exp.passcodeEnabled),
      passcodeHash: exp.passcodeHash || '',
      passcodeHint: (exp.passcodeHint || '').slice(0, 120),
      moderationRequired: Boolean(exp.moderationRequired),
      viewCount: isNew ? 0 : exp.viewCount || 0,
      reportCount: exp.reportCount || 0,
      coverImage: (exp.coverImage || '').slice(0, 580000),
      themeConfig: exp.themeConfig,
      effectsConfig: exp.effectsConfig,
      audioConfig: exp.audioConfig,
      sections: exp.sections.slice(0, 20),
      memories: exp.memories.slice(0, 15),
      gifts: exp.gifts.slice(0, 10),
      scratchCards: exp.scratchCards.slice(0, 8),
      quiz: exp.quiz,
      wheel: exp.wheel,
      puzzle: exp.puzzle,
      futureLetterMeta: exp.futureLetterMeta,
      finalMessage: exp.finalMessage,
      updatedAt: serverTimestamp(),
    };
    if (isNew) {
      cleanPayload.createdAt = serverTimestamp();
      await setDoc(ref, cleanPayload);
    } else {
      await updateDoc(ref, cleanPayload);
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function getExperienceById(id: string): Promise<BirthdayExperience | null> {
  const path = `experiences/${id}`;
  try {
    const snap = await getDoc(doc(db, 'experiences', id));
    if (!snap.exists()) return null;
    return snap.data() as BirthdayExperience;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function getUserExperiences(uid: string): Promise<BirthdayExperience[]> {
  const path = 'experiences';
  try {
    const q = query(
      collection(db, 'experiences'),
      where('ownerId', '==', uid),
      orderBy('updatedAt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as BirthdayExperience);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getPublicExperiences(): Promise<BirthdayExperience[]> {
  const path = 'experiences';
  try {
    const q = query(
      collection(db, 'experiences'),
      where('published', '==', true),
      where('visibility', '==', 'public'),
      limit(30)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as BirthdayExperience);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function deleteExperienceById(id: string): Promise<void> {
  const path = `experiences/${id}`;
  try {
    await deleteDoc(doc(db, 'experiences', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function incrementExperienceView(exp: BirthdayExperience, locale: Language): Promise<void> {
  const path = `experiences/${exp.id}`;
  try {
    await updateDoc(doc(db, 'experiences', exp.id), {
      viewCount: increment(1),
    });
    const viewId = `view_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await setDoc(doc(db, 'experiences', exp.id, 'views', viewId), {
      experienceId: exp.id,
      ownerId: exp.ownerId,
      locale,
      viewedAt: serverTimestamp(),
    });
  } catch {
    // Non-critical analytics increment shouldn't break guest viewing
  }
}

// --- Server-Time Enforced Future Letters ---
export async function saveFutureLetterSecret(params: {
  experienceId: string;
  ownerId: string;
  unlockDateIso: string;
  message: string;
  senderName: string;
  photoUrl?: string;
  audioUrl?: string;
}): Promise<void> {
  const path = `experiences/${params.experienceId}/futureLetters/main`;
  try {
    const ref = doc(db, 'experiences', params.experienceId, 'futureLetters', 'main');
    const existingSnap = await getDoc(ref).catch(() => null);
    const unlockTs = Timestamp.fromDate(new Date(params.unlockDateIso));
    const payload: Record<string, unknown> = {
      experienceId: params.experienceId,
      ownerId: params.ownerId,
      unlockAt: unlockTs,
      message: params.message.slice(0, 5000),
      senderName: params.senderName.slice(0, 100),
      photoUrl: (params.photoUrl || '').slice(0, 580000),
      audioUrl: (params.audioUrl || '').slice(0, 580000),
      updatedAt: serverTimestamp(),
    };
    if (!existingSnap || !existingSnap.exists()) {
      payload.createdAt = serverTimestamp();
      await setDoc(ref, payload);
    } else {
      await updateDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchFutureLetterSecret(
  experienceId: string
): Promise<{ status: 'unlocked'; letter: FutureLetterSecret } | { status: 'locked' | 'missing' }> {
  try {
    const snap = await getDoc(doc(db, 'experiences', experienceId, 'futureLetters', 'main'));
    if (!snap.exists()) return { status: 'missing' };
    return { status: 'unlocked', letter: snap.data() as FutureLetterSecret };
  } catch {
    // Firestore Security Rules return permission-denied while unlockAt > request.time
    return { status: 'locked' };
  }
}

// --- Wishing Tree & Friends/Family Wall ---
export async function submitWish(params: {
  experienceId: string;
  ownerId: string;
  authorName: string;
  isAnonymous: boolean;
  type: 'wish' | 'text' | 'audio' | 'video';
  message: string;
  mediaUrl?: string;
  leafColor?: string;
  moderationRequired: boolean;
}): Promise<BirthdayWish> {
  const wishId = `wish_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `experiences/${params.experienceId}/wishes/${wishId}`;
  try {
    const status = params.moderationRequired ? 'pending' : 'approved';
    const docData: BirthdayWish = {
      id: wishId,
      experienceId: params.experienceId,
      ownerId: params.ownerId,
      authorName: (params.isAnonymous ? 'Anonymous Friend' : params.authorName || 'Friend').slice(0, 80),
      isAnonymous: params.isAnonymous,
      type: params.type,
      message: params.message.slice(0, 1200),
      mediaUrl: (params.mediaUrl || '').slice(0, 580000),
      status,
      leafColor: params.leafColor || '#F4D35E',
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'experiences', params.experienceId, 'wishes', wishId), docData);
    return docData;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getApprovedWishes(experienceId: string): Promise<BirthdayWish[]> {
  const path = `experiences/${experienceId}/wishes`;
  try {
    const q = query(
      collection(db, 'experiences', experienceId, 'wishes'),
      where('status', '==', 'approved'),
      limit(60)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as BirthdayWish);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getAllWishesForOwner(experienceId: string, ownerId: string): Promise<BirthdayWish[]> {
  const path = `experiences/${experienceId}/wishes`;
  try {
    const q = query(
      collection(db, 'experiences', experienceId, 'wishes'),
      where('ownerId', '==', ownerId),
      limit(100)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as BirthdayWish);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function moderateWishStatus(
  experienceId: string,
  wishId: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  const path = `experiences/${experienceId}/wishes/${wishId}`;
  try {
    await updateDoc(doc(db, 'experiences', experienceId, 'wishes', wishId), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteWish(experienceId: string, wishId: string): Promise<void> {
  const path = `experiences/${experienceId}/wishes/${wishId}`;
  try {
    await deleteDoc(doc(db, 'experiences', experienceId, 'wishes', wishId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Moderation Reports & Admin Operations ---
export async function submitReport(params: {
  experienceId: string;
  experienceTitle: string;
  reason: string;
  reporterUid?: string;
}): Promise<void> {
  const reportId = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `reports/${reportId}`;
  try {
    await setDoc(doc(db, 'reports', reportId), {
      experienceId: params.experienceId,
      experienceTitle: params.experienceTitle.slice(0, 160),
      reason: params.reason.slice(0, 500),
      reporterUid: params.reporterUid || 'visitor',
      status: 'open',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function adminFetchAllData(): Promise<{
  users: UserProfile[];
  experiences: BirthdayExperience[];
  reports: ContentReport[];
  settings: PlatformSettings;
}> {
  try {
    const [usersSnap, expSnap, repSnap, settingsSnap] = await Promise.all([
      getDocs(query(collection(db, 'users'), limit(100))),
      getDocs(query(collection(db, 'experiences'), limit(100))),
      getDocs(query(collection(db, 'reports'), limit(100))),
      getDoc(doc(db, 'platformSettings', 'global')),
    ]);
    return {
      users: usersSnap.docs.map((d) => d.data() as UserProfile),
      experiences: expSnap.docs.map((d) => d.data() as BirthdayExperience),
      reports: repSnap.docs.map((d) => ({ ...(d.data() as ContentReport), id: d.id })),
      settings: settingsSnap.exists()
        ? (settingsSnap.data() as PlatformSettings)
        : DEFAULT_PLATFORM_SETTINGS,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'admin/overview');
  }
}

export async function adminUpdateReportStatus(reportId: string, status: 'resolved' | 'dismissed'): Promise<void> {
  const path = `reports/${reportId}`;
  try {
    await updateDoc(doc(db, 'reports', reportId), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminSavePlatformSettings(settings: PlatformSettings): Promise<void> {
  const path = 'platformSettings/global';
  try {
    await setDoc(doc(db, 'platformSettings', 'global'), {
      ...settings,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
