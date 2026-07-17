import { createContext, useContext } from 'react';

export const languages = [
  { code: 'en', label: 'English', flag: '/assets/flags/gb.svg', dir: 'ltr' },
  { code: 'ar', label: 'العربية', flag: '/assets/flags/tn.svg', dir: 'rtl' },
  { code: 'de', label: 'Deutsch', flag: '/assets/flags/de.svg', dir: 'ltr' },
];

const translations = {
  en: {
    language: 'Language', lightMode: 'Light mode', darkMode: 'Dark mode', switchMode: 'Switch to {mode} mode',
    welcome: 'Welcome to Tunisia Flights Tracker!', subscription: '0. Flight Price Alerts Subscription', email: 'Email:', emailPlaceholder: 'Enter your email',
    emailHelp: "We'll use this email to save your preferences and send price alerts.", saveEmail: 'Save My Email', saveEmailHelp: 'Save your email to enable subscriptions and notifications.',
    notifications: 'Enable Email Notifications', subscriptionHelp: 'To add a new subscription, first search for flights, then click on a result to set a price alert.',
    subscribedFlights: 'Your Subscribed Flights:', refreshSubscriptions: 'Refresh subscriptions', noSubscriptions: 'You have no active flight price subscriptions.', target: 'Target:', deleteSubscription: 'Delete subscription',
    airports: '1. Select Departure & Arrival Airports', departure: 'Departure:', arrival: 'Arrival:', tunisia: 'Tunisia', germany: 'Germany', switchDirection: 'Switch direction',
    dateRange: '3. Select Date Range', datePresets: 'Date range presets', start: 'Start:', end: 'End:', airlines: '4. Select Preferred Airlines (Multi-select)', showFlights: 'Show Flights',
    searching: 'Searching flights...', noFlights: 'No flights found for your selected criteria.', trends: 'Flight Price Trends', clickDetails: '(Click a bar to show details)', currentPrice: 'Current Price (EUR)', pricesForRoute: 'Prices for Route:', price: 'Price:', departureDate: 'Departure Date', priceEur: 'Price (EUR)', noRouteData: 'No flight data to display for this route.', page: 'Page {current} of {total}',
    closeDetails: 'Close flight details', history: 'Price History for this Search', loadingChart: 'Loading chart...', pricesCurrently: 'Prices are currently', similarTrips: 'Similar trips usually cost between €{low}–€{high}.', trackFlight: 'Track this Flight', targetPrice: 'Target Price', currentAlert: 'Current alert: €{price}', saving: 'Saving...', updateAlert: 'Update Alert', setAlert: 'Set Alert', emailFirst: 'Enter your email first to track this flight.', alreadyTracking: 'You are already tracking this flight. Update the target price if needed.', readyToBook: 'Ready to Book?', bookNow: 'Book Now ✈️', min: 'Min', max: 'Max',
  },
  ar: {
    language: 'اللغة', lightMode: 'الوضع الفاتح', darkMode: 'الوضع الداكن', switchMode: 'التبديل إلى الوضع {mode}',
    welcome: 'مرحبًا بك في متتبع رحلات تونس!', subscription: '0. الاشتراك في تنبيهات أسعار الرحلات', email: 'البريد الإلكتروني:', emailPlaceholder: 'أدخل بريدك الإلكتروني',
    emailHelp: 'سنستخدم هذا البريد لحفظ تفضيلاتك وإرسال تنبيهات الأسعار.', saveEmail: 'حفظ بريدي الإلكتروني', saveEmailHelp: 'احفظ بريدك لتفعيل الاشتراكات والإشعارات.',
    notifications: 'تفعيل إشعارات البريد الإلكتروني', subscriptionHelp: 'لإضافة اشتراك جديد، ابحث أولاً عن الرحلات ثم انقر على نتيجة لتعيين تنبيه سعر.',
    subscribedFlights: 'رحلاتك المشترَك بها:', refreshSubscriptions: 'تحديث الاشتراكات', noSubscriptions: 'ليس لديك اشتراكات نشطة لتنبيهات أسعار الرحلات.', target: 'السعر المستهدف:', deleteSubscription: 'حذف الاشتراك',
    airports: '1. اختر مطارات المغادرة والوصول', departure: 'المغادرة:', arrival: 'الوصول:', tunisia: 'تونس', germany: 'ألمانيا', switchDirection: 'تبديل الاتجاه',
    dateRange: '3. اختر نطاق التاريخ', datePresets: 'اختصارات نطاق التاريخ', start: 'البداية:', end: 'النهاية:', airlines: '4. اختر شركات الطيران المفضلة (اختيار متعدد)', showFlights: 'عرض الرحلات',
    searching: 'جارٍ البحث عن الرحلات...', noFlights: 'لم يتم العثور على رحلات للمعايير المحددة.', trends: 'اتجاهات أسعار الرحلات', clickDetails: '(انقر على عمود لعرض التفاصيل)', currentPrice: 'السعر الحالي (يورو)', pricesForRoute: 'أسعار المسار:', price: 'السعر:', departureDate: 'تاريخ المغادرة', priceEur: 'السعر (يورو)', noRouteData: 'لا توجد بيانات رحلات لعرضها لهذا المسار.', page: 'الصفحة {current} من {total}',
    closeDetails: 'إغلاق تفاصيل الرحلة', history: 'سجل الأسعار لهذا البحث', loadingChart: 'جارٍ تحميل الرسم...', pricesCurrently: 'الأسعار حاليًا', similarTrips: 'تكلفة الرحلات المشابهة عادةً بين €{low}–€{high}.', trackFlight: 'تتبع هذه الرحلة', targetPrice: 'السعر المستهدف', currentAlert: 'التنبيه الحالي: €{price}', saving: 'جارٍ الحفظ...', updateAlert: 'تحديث التنبيه', setAlert: 'تعيين تنبيه', emailFirst: 'أدخل بريدك الإلكتروني أولاً لتتبع هذه الرحلة.', alreadyTracking: 'أنت تتتبع هذه الرحلة بالفعل. حدّث السعر المستهدف عند الحاجة.', readyToBook: 'جاهز للحجز؟', bookNow: 'احجز الآن ✈️', min: 'الحد الأدنى', max: 'الحد الأقصى',
  },
  de: {
    language: 'Sprache', lightMode: 'Heller Modus', darkMode: 'Dunkler Modus', switchMode: 'Zu {mode} wechseln',
    welcome: 'Willkommen beim Tunesien-Flugtracker!', subscription: '0. Flugpreisbenachrichtigungen', email: 'E-Mail:', emailPlaceholder: 'E-Mail-Adresse eingeben',
    emailHelp: 'Wir verwenden diese E-Mail, um Ihre Einstellungen zu speichern und Preisbenachrichtigungen zu senden.', saveEmail: 'E-Mail speichern', saveEmailHelp: 'Speichern Sie Ihre E-Mail, um Abonnements und Benachrichtigungen zu aktivieren.',
    notifications: 'E-Mail-Benachrichtigungen aktivieren', subscriptionHelp: 'Suchen Sie zuerst nach Flügen und klicken Sie dann auf ein Ergebnis, um einen Preisalarm einzurichten.',
    subscribedFlights: 'Ihre abonnierten Flüge:', refreshSubscriptions: 'Abonnements aktualisieren', noSubscriptions: 'Sie haben keine aktiven Flugpreis-Abonnements.', target: 'Zielpreis:', deleteSubscription: 'Abonnement löschen',
    airports: '1. Abflug- und Ankunftsflughäfen auswählen', departure: 'Abflug:', arrival: 'Ankunft:', tunisia: 'Tunesien', germany: 'Deutschland', switchDirection: 'Richtung wechseln',
    dateRange: '3. Datumsbereich auswählen', datePresets: 'Datumsbereich-Voreinstellungen', start: 'Start:', end: 'Ende:', airlines: '4. Bevorzugte Fluggesellschaften auswählen (Mehrfachauswahl)', showFlights: 'Flüge anzeigen',
    searching: 'Flüge werden gesucht...', noFlights: 'Keine Flüge für die gewählten Kriterien gefunden.', trends: 'Flugpreisentwicklung', clickDetails: '(Für Details auf einen Balken klicken)', currentPrice: 'Aktueller Preis (EUR)', pricesForRoute: 'Preise für Strecke:', price: 'Preis:', departureDate: 'Abflugdatum', priceEur: 'Preis (EUR)', noRouteData: 'Keine Flugdaten für diese Strecke verfügbar.', page: 'Seite {current} von {total}',
    closeDetails: 'Flugdetails schließen', history: 'Preisentwicklung für diese Suche', loadingChart: 'Diagramm wird geladen...', pricesCurrently: 'Die Preise sind aktuell', similarTrips: 'Ähnliche Reisen kosten normalerweise zwischen €{low}–€{high}.', trackFlight: 'Diesen Flug verfolgen', targetPrice: 'Zielpreis', currentAlert: 'Aktueller Alarm: €{price}', saving: 'Wird gespeichert...', updateAlert: 'Alarm aktualisieren', setAlert: 'Alarm einrichten', emailFirst: 'Geben Sie zuerst Ihre E-Mail ein, um diesen Flug zu verfolgen.', alreadyTracking: 'Sie verfolgen diesen Flug bereits. Aktualisieren Sie den Zielpreis bei Bedarf.', readyToBook: 'Bereit zum Buchen?', bookNow: 'Jetzt buchen ✈️', min: 'Min.', max: 'Max.',
  },
};

export const LanguageContext = createContext({ language: 'en', t: (key) => key });

export function translate(language, key, values = {}) {
  let text = translations[language]?.[key] || translations.en[key] || key;
  Object.entries(values).forEach(([name, value]) => { text = text.replaceAll(`{${name}}`, value); });
  return text;
}

export const useLanguage = () => useContext(LanguageContext);
