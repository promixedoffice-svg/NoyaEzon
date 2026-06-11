import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function LegalPage() {
  const settings = await prisma.businessSettings.findFirst()
  const businessName = settings?.businessName ?? 'העסק'
  const ownerName = settings?.ownerName
  const businessNumber = settings?.businessNumber
  const phone = settings?.phone
  const email = settings?.email
  const address = settings?.address
  const updatedAt = new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())

  return (
    <div className="min-h-screen py-8 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-brand-100 shadow-sm p-6 sm:p-8 space-y-8 text-sm leading-relaxed text-brand-900">
        <div>
          <h1 className="text-xl font-bold text-brand-900">תנאי שימוש ומדיניות פרטיות - {businessName}</h1>
          <p className="text-xs text-muted mt-1">עודכן לאחרונה: {updatedAt}</p>
        </div>

        <section id="terms" className="space-y-3">
          <h2 className="text-lg font-semibold text-brand-900">תנאי שימוש</h2>

          <div>
            <h3 className="font-medium text-brand-800 mb-1">1. כללי</h3>
            <p>תנאים אלו חלים על השימוש במערכת הזמנת התורים המקוונת של {businessName}{ownerName ? ` (${ownerName})` : ''}{businessNumber ? `, ע.מ./ח.פ ${businessNumber}` : ''} ("העסק"). הזמנת תור דרך המערכת מהווה הסכמה לתנאים אלו.</p>
          </div>

          <div>
            <h3 className="font-medium text-brand-800 mb-1">2. הזמנת תורים</h3>
            <p>הזמנת תור באמצעות המערכת היא בקשה בלבד, ואינה מהווה אישור סופי עד לקבלת אישור מהעסק. העסק רשאי לאשר, לדחות או להציע מועד חלופי לבקשת התור.</p>
          </div>

          <div>
            <h3 className="font-medium text-brand-800 mb-1">3. ביטולים ושינויים</h3>
            <p>נא להודיע על ביטול או שינוי מועד תור בהקדם האפשרי ומראש ככל הניתן, על מנת לאפשר לעסק להציע את התור ללקוחות אחרים. העסק רשאי לקבוע מדיניות חיוב בגין ביטול בסמוך למועד התור או אי-הגעה, ותעודכן הלקוחה מראש במידת הצורך.</p>
          </div>

          <div>
            <h3 className="font-medium text-brand-800 mb-1">4. מחירים ותשלומים</h3>
            <p>המחירים המוצגים במערכת הם מחירי בסיס לטיפולים ועשויים להשתנות בהתאם לתוספות או התאמות אישיות שייקבעו במקום על ידי הצוות המטפל.</p>
          </div>

          <div>
            <h3 className="font-medium text-brand-800 mb-1">5. אחריות</h3>
            <p>העסק עושה כמיטב יכולתו להבטיח את זמינות המערכת ותקינותה, אך אינו אחראי לתקלות זמניות, שיבושים בתקשורת או אי-דיוקים שעלולים להיגרם כתוצאה מכך.</p>
          </div>

          <div>
            <h3 className="font-medium text-brand-800 mb-1">6. שינויים בתנאים</h3>
            <p>העסק רשאי לעדכן תנאים אלו מעת לעת. המשך השימוש במערכת לאחר עדכון מהווה הסכמה לתנאים המעודכנים.</p>
          </div>
        </section>

        <section id="privacy" className="space-y-3 border-t border-brand-50 pt-6">
          <h2 className="text-lg font-semibold text-brand-900">מדיניות פרטיות</h2>

          <div>
            <h3 className="font-medium text-brand-800 mb-1">1. המידע שאנו אוספים</h3>
            <p>בעת הזמנת תור, נאסוף פרטים כגון שם מלא, מספר טלפון וכתובת אימייל. בנוסף, ייתכן שיישמרו פרטי הטיפולים שביצעת, הערות והעדפות הרלוונטיות למתן הטיפול (לרבות רגישויות, אם נמסרו).</p>
          </div>

          <div>
            <h3 className="font-medium text-brand-800 mb-1">2. השימוש במידע</h3>
            <p>המידע משמש לניהול התורים שלך, יצירת קשר לאישור/תזכורת לתור, הפקת קבלות, וניהול כרטיס לקוח לצורך מתן שירות מותאם אישית.</p>
          </div>

          <div>
            <h3 className="font-medium text-brand-800 mb-1">3. שיתוף מידע עם צדדים שלישיים</h3>
            <p>המידע אינו נמכר או מועבר לצדדים שלישיים למטרות שיווק. ייתכן שימוש בשירותים טכנולוגיים חיצוניים לתפעול המערכת (כגון שליחת הודעות אימייל, או סנכרון יומן/גיבוי ל-Google), אך ורק לצורך מתן השירות עצמו.</p>
          </div>

          <div>
            <h3 className="font-medium text-brand-800 mb-1">4. אבטחת מידע</h3>
            <p>המידע נשמר במערכות מאובטחות, והגישה אליו מוגבלת לצוות העסק בלבד.</p>
          </div>

          <div>
            <h3 className="font-medium text-brand-800 mb-1">5. זכויותייך</h3>
            <p>באפשרותך לפנות אלינו בכל עת בבקשה לעיין במידע השמור אודותייך, לתקנו או לבקש את מחיקתו, בכפוף לכל חובת שמירת רישומים על פי דין.</p>
          </div>

          <div>
            <h3 className="font-medium text-brand-800 mb-1">6. יצירת קשר</h3>
            <p>לכל שאלה או בקשה הנוגעת למידע האישי שלך, ניתן ליצור קשר עם {businessName}{ownerName ? ` - ${ownerName}` : ''}{phone ? ` בטלפון ${phone}` : ''}{email ? ` או באימייל ${email}` : ''}{address ? `, ${address}` : ''}.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
