import kbDb from '../lib/db/kbDb';

const newArticles = [
  {
    title: 'Financial Aid and Scholarship Information',
    content: `The Financial Aid Office helps students navigate financial assistance options.

Types of Aid Available:
- Federal Pell Grants (need-based, no repayment required)
- Federal Direct Loans (subsidized and unsubsidized)
- Work-Study Programs (part-time campus employment)
- Merit-based Scholarships (academic achievement)
- Need-based Grants (institutional funds)
- Emergency Financial Assistance (short-term crisis support)

Key Deadlines:
- FAFSA Priority Deadline: March 1st each year
- Scholarship Applications: February 15th
- Appeal Deadline: 30 days after award notification

How to Apply:
1. Complete the FAFSA at studentaid.gov
2. Submit supplemental university aid application
3. Review your award letter in the student portal
4. Accept or decline individual aid components

Contact: Financial Aid Office, Room 201, Main Hall
Phone: 555-0200
Email: finaid@university.edu
Hours: Monday-Friday 9:00 AM - 4:30 PM

Note: The Student Success Concierge cannot process financial aid applications directly. For detailed financial aid questions, please contact the Financial Aid Office.`,
    category: 'Financial',
    tags: JSON.stringify(['financial aid', 'scholarships', 'FAFSA', 'grants']),
  },
  {
    title: 'Mental Health and Wellness Resources',
    content: `The university provides comprehensive mental health support for all enrolled students.

Counseling Center Services:
- Individual therapy sessions (up to 12 per academic year)
- Group therapy and support groups
- Couples counseling
- Substance abuse counseling
- Crisis intervention

Wellness Programs:
- Stress management workshops (every Tuesday 3 PM)
- Mindfulness and meditation sessions (Wednesdays 12 PM)
- Peer support network
- Online self-help resources and assessments

How to Access Services:
- Schedule through the student portal or call 555-0150
- First appointment is a 30-minute intake assessment
- Ongoing sessions are 50 minutes
- Telehealth appointments available

Wait Times:
- Urgent concerns: Same-day or next-day appointment
- Routine intake: Usually within 5 business days
- If wait exceeds 2 weeks, off-campus referrals provided at no cost

Confidentiality: All counseling services are confidential. Records are kept separate from academic records.

Location: Wellness Center, Building C, 2nd Floor
Hours: Monday-Friday 8:00 AM - 6:00 PM`,
    category: 'Wellness',
    tags: JSON.stringify(['mental health', 'counseling', 'wellness', 'therapy']),
  },
  {
    title: 'Student Housing and Residential Life',
    content: `Campus housing is available for undergraduate and graduate students.

Housing Options:
- Traditional Dormitories (shared rooms, meal plan required)
- Suite-Style Living (2-4 person suites with shared bathroom)
- Apartment-Style Housing (full kitchen, for upperclassmen)
- Graduate Student Housing (studio and 1-bedroom units)

Room and Board Costs (per semester):
- Traditional Double: $4,500
- Suite Single: $5,800
- Apartment 2-Bedroom: $3,900 per person
- Graduate Studio: $6,200

Important Dates:
- Housing Application Opens: April 1st
- Room Selection: May 1st-15th
- Move-In Day: Published on academic calendar
- Move-Out: Within 48 hours of last final exam

Maintenance Requests:
- Submit through the housing portal
- Emergency maintenance: Call 555-0300 (24/7)
- Non-emergency requests handled within 3 business days

Contact: Office of Residential Life, Housing Building
Phone: 555-0300
Email: housing@university.edu

Note: Housing assignments and changes are handled by the Residential Life Office, not Student Success.`,
    category: 'Housing',
    tags: JSON.stringify(['housing', 'dormitory', 'residential', 'room and board']),
  },
  {
    title: 'Registration and Course Enrollment',
    content: `Course registration is managed through the student portal each semester.

Registration Windows:
- Seniors (90+ credits): Week 1
- Juniors (60-89 credits): Week 2
- Sophomores (30-59 credits): Week 3
- Freshmen (0-29 credits): Week 4

How to Register:
1. Meet with your academic advisor (required before registration opens)
2. Log into the student portal
3. Search for courses by department, number, or keyword
4. Add courses to your cart
5. Submit your schedule

Adding/Dropping Courses:
- Add/Drop period: First 2 weeks of semester (no penalty)
- Late add: Requires instructor and dean approval
- Withdrawal (W grade): Weeks 3-10 of semester
- After Week 10: No withdrawals allowed

Course Load:
- Full-time: 12-18 credit hours
- Overload (19+ credits): Requires advisor approval and minimum 3.5 GPA
- Part-time: Below 12 credits (may affect financial aid)

Waitlists:
- Automatic enrollment if spot opens before classes start
- Waitlist removed after first week of classes

Contact: Registrar's Office, Room 100, Admin Building
Phone: 555-0400`,
    category: 'Academic',
    tags: JSON.stringify(['registration', 'enrollment', 'courses', 'add/drop']),
  },
  {
    title: 'Library Services and Study Spaces',
    content: `The university library system supports academic success with resources and study spaces.

Library Hours:
- Monday-Thursday: 7:00 AM - 12:00 AM (Midnight)
- Friday: 7:00 AM - 9:00 PM
- Saturday: 9:00 AM - 6:00 PM
- Sunday: 12:00 PM - 12:00 AM (Midnight)
- Extended hours during finals: 24/7 operation

Study Spaces:
- Individual study carrels (no reservation needed)
- Group study rooms (book online, 2-hour blocks)
- Silent study floors (3rd and 4th floors)
- Computer labs with printing (2nd floor)
- Graduate student reading room (5th floor, ID required)

Services:
- Research assistance and reference librarians
- Interlibrary loan (3-5 business days)
- Course reserves (textbooks on 2-hour loan)
- Printing/scanning/copying (first 50 pages free per semester)
- Technology lending (laptops, chargers, calculators)

Online Resources:
- Database access (JSTOR, PubMed, IEEE, etc.)
- E-books and digital journals
- Citation management tools (RefWorks, Zotero)
- 24/7 online chat with librarians

Contact: Main Library Reference Desk
Phone: 555-0500
Online: library.university.edu`,
    category: 'Academic',
    tags: JSON.stringify(['library', 'study spaces', 'research', 'resources']),
  },
  {
    title: 'Student Organizations and Campus Life',
    content: `The university has over 200 registered student organizations across various categories.

Organization Categories:
- Academic and Professional (honor societies, career clubs)
- Cultural and Identity (multicultural orgs, international student groups)
- Community Service and Volunteering
- Sports and Recreation (club sports, intramurals)
- Arts and Performance (theater, music, dance)
- Media (newspaper, radio, TV station)
- Student Government (SGA, class councils)

How to Join:
- Browse organizations at involvement.university.edu
- Attend the Activities Fair (held first week of each semester)
- Contact organization leaders directly through the portal
- Most organizations accept members year-round

Starting a New Organization:
1. Gather minimum 10 interested students
2. Identify a faculty/staff advisor
3. Submit application to Student Activities Office
4. Attend mandatory leadership training
5. Approval process takes 2-4 weeks

Funding:
- SGA provides funding for registered organizations
- Budget requests due September 15th (Fall) and January 15th (Spring)
- Emergency funding available through special request

Contact: Student Activities Office, Student Union Room 302
Phone: 555-0600
Email: activities@university.edu`,
    category: 'Campus Life',
    tags: JSON.stringify(['clubs', 'organizations', 'activities', 'campus life']),
  },
  {
    title: 'Disability Services and Accommodations',
    content: `The Office of Disability Services (ODS) ensures equal access for students with disabilities.

Eligibility:
- Students with documented physical, learning, psychological, or chronic health disabilities
- Must provide current documentation from a qualified professional
- Documentation reviewed within 5 business days

Common Accommodations:
- Extended test time (typically 1.5x or 2x)
- Separate testing environment
- Note-taking assistance
- Priority registration
- Accessible classroom seating
- Assistive technology (screen readers, voice-to-text)
- Flexible attendance policies (case-by-case)
- Housing accommodations

How to Register:
1. Complete the ODS intake form online
2. Submit supporting documentation
3. Schedule an intake meeting with ODS coordinator
4. Receive accommodation letter
5. Share letter with instructors each semester

Important: Accommodations are NOT retroactive. Register as early as possible.

Exam Accommodations:
- Instructors notified via accommodation letter
- Students must schedule exams with ODS at least 5 days in advance
- ODS Testing Center: Room 105, Student Services Building

Contact: Office of Disability Services
Phone: 555-0700
Email: ods@university.edu
Location: Student Services Building, Room 104
Hours: Monday-Friday 8:30 AM - 5:00 PM`,
    category: 'Accessibility',
    tags: JSON.stringify(['disability', 'accommodations', 'accessibility', 'ADA']),
  },
];

async function main() {
  console.log('📚 Adding new knowledge base articles...\n');

  const db = await kbDb.getDb();

  const stmt = db.prepare(`
    INSERT INTO kb_articles (title, content, category, tags)
    VALUES (?, ?, ?, ?)
  `);

  for (const article of newArticles) {
    stmt.bind([article.title, article.content, article.category, article.tags]);
    stmt.step();
    stmt.reset();
    console.log(`  ✓ Added: ${article.title}`);
  }
  stmt.free();
  kbDb.saveDb();

  // Show totals
  const countStmt = db.prepare('SELECT COUNT(*) as total FROM kb_articles');
  countStmt.step();
  const total = countStmt.getAsObject().total;
  countStmt.free();

  const catStmt = db.prepare('SELECT category, COUNT(*) as count FROM kb_articles GROUP BY category ORDER BY category');
  console.log(`\n✅ Added ${newArticles.length} articles. Total articles: ${total}\n`);
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
