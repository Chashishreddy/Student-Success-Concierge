import kbDb from '../lib/db/kbDb';

const extraArticles = [
  {
    title: 'Parking and Transportation Services',
    content: `Campus parking permits and transportation options for students.

Parking Permits:
- Commuter Permit: $150/semester (Lots C, D, E)
- Residential Permit: $200/semester (Lots A, B)
- Evening/Weekend Permit: $75/semester (all lots after 5 PM)
- Motorcycle Permit: $50/semester

How to Purchase:
1. Log into the student portal
2. Navigate to Parking Services
3. Select permit type and vehicle information
4. Pay online or at the Parking Office

Parking Rules:
- Permits must be displayed at all times
- No parking in faculty/staff lots before 5 PM
- Violations: $25 first offense, $50 second, $100 third
- 5+ violations in one semester: permit revocation

Alternative Transportation:
- Campus shuttle: Free for students, runs every 15 minutes (7 AM - 10 PM)
- City bus pass: $50/semester (subsidized by university)
- Bike share program: Free registration at Campus Security
- Electric scooter stations at 5 campus locations

Contact: Parking Services, Campus Security Building
Phone: 555-0800
Hours: Monday-Friday 8:00 AM - 5:00 PM`,
    category: 'Transportation',
    tags: JSON.stringify(['parking', 'transportation', 'shuttle', 'permits']),
  },
  {
    title: 'Graduation Requirements and Degree Audit',
    content: `Requirements for completing your undergraduate degree.

General Requirements:
- Minimum 120 credit hours
- Minimum cumulative GPA of 2.0
- Complete all major and minor requirements
- Complete general education core (42 credits)
- Residency requirement: Last 30 credits at this university
- Maximum 6 years to complete degree

General Education Core (42 credits):
- English Composition: 6 credits
- Mathematics: 6 credits
- Natural Sciences: 8 credits (with lab)
- Social Sciences: 6 credits
- Humanities: 6 credits
- Diversity & Global Awareness: 6 credits
- First-Year Seminar: 4 credits

Degree Audit:
- Available in the student portal under "Academic Records"
- Updated in real-time as grades are posted
- Shows completed, in-progress, and remaining requirements
- Run an audit before each registration period

Applying for Graduation:
- Apply by October 1st for December graduation
- Apply by February 1st for May graduation
- Apply by June 1st for August graduation
- $75 graduation fee
- Cap and gown ordered through the bookstore

Contact: Registrar's Office
Phone: 555-0400`,
    category: 'Academic',
    tags: JSON.stringify(['graduation', 'degree', 'requirements', 'audit']),
  },
  {
    title: 'International Student Services',
    content: `Support and resources for international students at the university.

Immigration Services:
- F-1 and J-1 visa advising
- I-20 and DS-2019 document processing
- CPT and OPT employment authorization
- Travel signature requests (allow 5 business days)
- SEVIS status maintenance guidance

Important Requirements:
- Maintain full-time enrollment (12+ credits undergrad, 9+ credits grad)
- Report address changes within 10 days
- Report changes in major or academic level
- Obtain work authorization before any employment
- Maintain valid passport (6+ months validity recommended)

Support Services:
- New student orientation (mandatory for all new international students)
- English conversation groups (Tuesdays and Thursdays 4 PM)
- Cultural adjustment workshops
- Tax preparation assistance (February-April)
- Host family program

Health Insurance:
- University health insurance required for all international students
- Waiver available only with approved comparable coverage
- Coverage includes medical, dental, and emergency evacuation

Contact: International Student Services, Global Center Room 200
Phone: 555-0900
Email: international@university.edu
Hours: Monday-Friday 9:00 AM - 5:00 PM
Walk-in hours: Tuesday and Thursday 2:00 PM - 4:00 PM`,
    category: 'International',
    tags: JSON.stringify(['international', 'visa', 'F-1', 'immigration']),
  },
  {
    title: 'Technology Support and IT Help Desk',
    content: `IT services available to all enrolled students.

Help Desk:
- Phone: 555-TECH (555-8324)
- Email: helpdesk@university.edu
- Live chat: Available on IT website
- Walk-in: Library 1st Floor, Room 110
- Hours: Monday-Friday 8 AM - 8 PM, Saturday 10 AM - 4 PM

Student Technology Resources:
- University email account (lifetime access)
- Microsoft Office 365 (free while enrolled)
- Adobe Creative Cloud (free in campus labs)
- VPN access for off-campus connections
- 50 GB cloud storage
- Free antivirus software

WiFi:
- Network: UniWiFi (WPA2-Enterprise, use university credentials)
- Guest network: UniGuest (limited, 24-hour access)
- Coverage: All campus buildings and common outdoor areas
- Issues? Forget network and reconnect, or contact Help Desk

Computer Labs:
- Library (2nd floor): 80 workstations, open during library hours
- Student Union: 30 workstations, 7 AM - 10 PM
- Science Building: 40 workstations, reserved for STEM students

Printing:
- $0.05/page black & white, $0.25/page color
- First 50 pages free each semester
- Print from any campus computer or via mobile print

Password Reset:
- Self-service at password.university.edu
- Or visit Help Desk with photo ID`,
    category: 'Technology',
    tags: JSON.stringify(['IT', 'technology', 'wifi', 'help desk', 'computer']),
  },
  {
    title: 'Student Health Center',
    content: `On-campus health services for enrolled students.

Services Available:
- Primary care visits (illness, injury, physicals)
- Immunizations and flu shots
- STI testing and treatment
- Women's health services
- Allergy injections
- Lab work and basic X-rays
- Prescription services (on-site pharmacy)
- Nutrition counseling

Costs:
- Office visits: $15 copay (covered by student health fee)
- Specialist referrals: May require insurance
- Immunizations: Most covered by health fee
- Lab work: Varies by test, insurance billed first

Hours:
- Monday-Friday: 8:00 AM - 5:00 PM
- Saturday: 9:00 AM - 12:00 PM (urgent care only)
- Closed Sundays and university holidays

Appointments:
- Schedule online through the student portal
- Walk-ins accepted but appointments preferred
- Urgent issues seen same day
- Cancel 4+ hours in advance to avoid $10 no-show fee

After Hours:
- Nurse advice line: 555-0111 (24/7)
- For emergencies, call 911 or go to nearest ER
- Nearest ER: City General Hospital (2 miles from campus)

Required Immunizations:
- MMR (2 doses)
- Meningococcal (within 5 years)
- Hepatitis B series
- TB screening (international students)

Location: Health Center Building, 100 Campus Drive
Phone: 555-0111`,
    category: 'Health',
    tags: JSON.stringify(['health', 'medical', 'clinic', 'immunizations']),
  },
  {
    title: 'Dining Services and Meal Plans',
    content: `Campus dining options and meal plan information.

Meal Plans (required for residential students):
- Unlimited Plan: $2,400/semester (unlimited dining hall + $200 flex dollars)
- 14-Meal Plan: $2,100/semester (14 meals/week + $300 flex dollars)
- 10-Meal Plan: $1,800/semester (10 meals/week + $400 flex dollars)
- Commuter Plan: $500/semester (50 meals + $100 flex dollars)

Dining Locations:
- Main Dining Hall (Building D): Buffet style, all-you-can-eat
  Hours: Mon-Fri 7 AM - 9 PM, Sat-Sun 9 AM - 8 PM
- Student Union Food Court: 5 restaurant options
  Hours: Mon-Fri 10 AM - 10 PM, Sat 11 AM - 8 PM
- Coffee Shop (Library): Coffee, pastries, light meals
  Hours: Mon-Thu 7 AM - 11 PM, Fri 7 AM - 6 PM
- Late Night Cafe (Residence Hall): Pizza, snacks
  Hours: Sun-Thu 9 PM - 1 AM

Flex Dollars:
- Accepted at all campus dining locations
- Can be used at campus convenience store
- Unused flex dollars roll over within the academic year
- Expire at end of spring semester

Dietary Accommodations:
- Vegetarian and vegan options at every meal
- Gluten-free station in Main Dining Hall
- Allergen information posted at all stations
- Meet with campus nutritionist for special dietary needs

Changes to Meal Plans:
- Can change plan during first 2 weeks of semester
- After 2 weeks, changes take effect next semester

Contact: Dining Services Office
Phone: 555-1200
Email: dining@university.edu`,
    category: 'Dining',
    tags: JSON.stringify(['dining', 'meal plan', 'food', 'cafeteria']),
  },
];

async function main() {
  console.log('📚 Adding extra knowledge base articles...\n');

  const db = await kbDb.getDb();

  const stmt = db.prepare(`
    INSERT INTO kb_articles (title, content, category, tags)
    VALUES (?, ?, ?, ?)
  `);

  for (const article of extraArticles) {
    stmt.bind([article.title, article.content, article.category, article.tags]);
    stmt.step();
    stmt.reset();
    console.log(`  ✓ Added: ${article.title}`);
  }
  stmt.free();
  kbDb.saveDb();

  const countStmt = db.prepare('SELECT COUNT(*) as total FROM kb_articles');
  countStmt.step();
  const total = countStmt.getAsObject().total;
  countStmt.free();

  const catStmt = db.prepare('SELECT category, COUNT(*) as count FROM kb_articles GROUP BY category ORDER BY category');
  console.log(`\n✅ Added ${extraArticles.length} articles. Total articles: ${total}\n`);
  console.log('Articles by category:');
  while (catStmt.step()) {
    const row = catStmt.getAsObject();
    console.log(`  - ${row.category}: ${row.count}`);
  }
  catStmt.free();
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
