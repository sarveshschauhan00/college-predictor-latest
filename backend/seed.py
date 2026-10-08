import random
from datetime import date
from core import db, uid, now_iso
from auth import hash_pw

_BASE = date(2026, 6, 1)


def rel(s: str) -> str:
    return (date.today() + (date.fromisoformat(s) - _BASE)).isoformat()

IMG = [
    "https://images.unsplash.com/photo-1680084521847-0e42cc80a5ee?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "https://images.unsplash.com/photo-1687709348710-05314eea5476?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "https://images.unsplash.com/photo-1695722099520-564bb36a3a6b?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "https://images.unsplash.com/photo-1680084521738-87a53d7a50d8?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
]

# slug, name, short, metric_type, total_candidates, score_max, body, streams, description, dates
EXAMS = [
    ("jee-main", "JEE Main", "JEE Main", "percentile", 1250000, 300, "NTA", ["Engineering"], "National-level engineering entrance for NITs, IIITs, GFTIs and eligibility for JEE Advanced.", {"Session 1": "Jan 2026", "Session 2": "Apr 2026", "JoSAA Counselling": "Jun–Jul 2026"}),
    ("jee-advanced", "JEE Advanced", "JEE Adv", "rank", 180000, 360, "IIT (rotating)", ["Engineering"], "Entrance exam for admission to the 23 IITs.", {"Exam": "May 2026", "Results": "Jun 2026", "JoSAA": "Jun–Jul 2026"}),
    ("neet", "NEET UG", "NEET", "score", 2300000, 720, "NTA", ["Medicine"], "Single national medical entrance for MBBS, BDS, AYUSH and nursing.", {"Exam": "May 2026", "Results": "Jun 2026", "MCC Counselling": "Jul–Aug 2026"}),
    ("cuet", "CUET UG", "CUET", "score", 1350000, 800, "NTA", ["Arts", "Commerce", "Science"], "Common University Entrance Test for central universities like DU, BHU, JNU.", {"Exam": "May 2026", "Results": "Jul 2026", "CSAS Counselling": "Jul–Aug 2026"}),
    ("clat", "CLAT", "CLAT", "rank", 70000, 120, "Consortium of NLUs", ["Law"], "Common Law Admission Test for 24 National Law Universities.", {"Exam": "Dec 2025", "Results": "Dec 2025", "Counselling": "Jan–Jun 2026"}),
    ("cat", "CAT", "CAT", "score", 330000, 100, "IIMs", ["Management"], "Common Admission Test for IIMs and top B-schools.", {"Exam": "Nov 2025", "Results": "Dec 2025"}),
    ("gate", "GATE", "GATE", "score", 900000, 1000, "IITs/IISc", ["Engineering"], "Graduate Aptitude Test in Engineering for M.Tech and PSU recruitment.", {"Exam": "Feb 2026", "Results": "Mar 2026"}),
    ("bitsat", "BITSAT", "BITSAT", "score", 150000, 390, "BITS Pilani", ["Engineering"], "Online entrance for BITS Pilani, Goa and Hyderabad campuses.", {"Session 1": "May 2026", "Session 2": "Jun 2026"}),
    ("viteee", "VITEEE", "VITEEE", "rank", 200000, 125, "VIT", ["Engineering"], "Entrance for VIT campuses.", {"Exam": "Apr 2026", "Counselling": "May 2026"}),
    ("mht-cet", "MHT-CET", "MHT-CET", "score", 400000, 100, "State CET Cell, Maharashtra", ["Engineering"], "Maharashtra state entrance for engineering and pharmacy.", {"Exam": "Apr–May 2026", "CAP Rounds": "Jul–Aug 2026"}),
    ("kcet", "KCET", "KCET", "rank", 300000, 180, "KEA Karnataka", ["Engineering"], "Karnataka Common Entrance Test.", {"Exam": "Apr 2026", "Counselling": "Jun–Jul 2026"}),
    ("wbjee", "WBJEE", "WBJEE", "rank", 120000, 200, "WBJEEB", ["Engineering"], "West Bengal Joint Entrance Exam.", {"Exam": "Apr 2026", "Counselling": "Jul 2026"}),
    ("comedk", "COMEDK UGET", "COMEDK", "rank", 90000, 180, "COMEDK", ["Engineering"], "Entrance for private engineering colleges in Karnataka.", {"Exam": "May 2026"}),
    ("nift", "NIFT Entrance", "NIFT", "rank", 50000, 100, "NIFT", ["Design"], "Entrance for National Institutes of Fashion Technology.", {"Exam": "Feb 2026", "Results": "Mar 2026"}),
    ("uceed", "UCEED", "UCEED", "rank", 15000, 300, "IIT Bombay", ["Design"], "Undergraduate design entrance for IITs and IIITDM.", {"Exam": "Jan 2026"}),
    ("ipmat", "IPMAT", "IPMAT", "score", 40000, 400, "IIM Indore", ["Management"], "Integrated Programme in Management aptitude test.", {"Exam": "May 2026"}),
    ("srmjeee", "SRMJEEE", "SRMJEEE", "rank", 150000, 125, "SRM IST", ["Engineering"], "Entrance for SRM campuses.", {"Exam": "Apr 2026"}),
    ("nid-dat", "NID DAT", "NID", "rank", 20000, 100, "NID", ["Design"], "Design Aptitude Test for National Institute of Design.", {"Prelims": "Jan 2026"}),
]

# slug, name, degree, stream, duration, difficulty, avg_salary_lpa, what, careers, skills, scope, exams
COURSES = [
    ("computer-science-engineering", "Computer Science & Engineering", "B.Tech", "Engineering", 4, "High", 12, "Algorithms, data structures, operating systems, databases, networks, software engineering and AI foundations.", ["Software Engineer", "Data Scientist", "Product Manager", "Systems Architect"], ["Programming", "Problem solving", "Mathematics"], "Strongest demand across IT, fintech, SaaS and AI; highest placement packages.", ["jee-main", "jee-advanced", "bitsat", "viteee", "mht-cet", "kcet", "wbjee", "comedk", "srmjeee"]),
    ("electronics-communication", "Electronics & Communication Engineering", "B.Tech", "Engineering", 4, "High", 8.5, "Analog/digital circuits, signal processing, VLSI, embedded systems, communication networks.", ["VLSI Engineer", "Embedded Engineer", "Telecom Engineer", "Software Developer"], ["Circuits", "Math", "Programming"], "Semiconductor boom in India (ISM) creates strong demand for chip design.", ["jee-main", "jee-advanced", "bitsat", "viteee", "kcet", "wbjee"]),
    ("electrical-engineering", "Electrical Engineering", "B.Tech", "Engineering", 4, "High", 7.5, "Power systems, machines, control systems, power electronics, renewable energy.", ["Power Engineer", "Control Engineer", "PSU Officer", "Energy Analyst"], ["Physics", "Math", "Systems thinking"], "Core demand from PSUs, EV and renewable sectors.", ["jee-main", "jee-advanced", "kcet", "wbjee"]),
    ("mechanical-engineering", "Mechanical Engineering", "B.Tech", "Engineering", 4, "Medium", 6.5, "Thermodynamics, mechanics, manufacturing, design, robotics, CAD/CAM.", ["Design Engineer", "Automotive Engineer", "Robotics Engineer", "Operations Manager"], ["Physics", "Design", "Analytical"], "Evergreen branch; EV and aerospace manufacturing are growth areas.", ["jee-main", "jee-advanced", "mht-cet", "kcet", "comedk"]),
    ("civil-engineering", "Civil Engineering", "B.Tech", "Engineering", 4, "Medium", 5.5, "Structural analysis, geotechnical, transportation, environmental and construction management.", ["Structural Engineer", "Site Engineer", "Urban Planner", "Govt Engineer"], ["Math", "Drawing", "Project management"], "Infrastructure push ensures steady government and private demand.", ["jee-main", "jee-advanced", "kcet", "wbjee"]),
    ("ai-machine-learning", "Artificial Intelligence & Machine Learning", "B.Tech", "Engineering", 4, "High", 11, "Machine learning, deep learning, NLP, computer vision, MLOps and data engineering.", ["ML Engineer", "AI Researcher", "Data Scientist", "AI Product Manager"], ["Math/Stats", "Python", "Research mindset"], "Fastest growing specialisation; overlaps heavily with CSE.", ["jee-main", "bitsat", "viteee", "srmjeee"]),
    ("data-science", "Data Science & Engineering", "B.Tech", "Engineering", 4, "High", 10, "Statistics, data mining, big data systems, visualisation and machine learning.", ["Data Scientist", "Data Engineer", "Analyst", "Quant"], ["Statistics", "SQL/Python", "Communication"], "High demand across every sector for data-literate engineers.", ["jee-main", "jee-advanced", "bitsat"]),
    ("information-technology", "Information Technology", "B.Tech", "Engineering", 4, "High", 9, "Software development, web technologies, cloud, cybersecurity and databases.", ["Software Developer", "Cloud Engineer", "Security Analyst"], ["Programming", "Networking"], "Nearly identical outcomes to CSE at most colleges.", ["jee-main", "mht-cet", "wbjee", "comedk"]),
    ("chemical-engineering", "Chemical Engineering", "B.Tech", "Engineering", 4, "Medium", 7, "Process design, thermodynamics, reaction engineering, petrochemicals.", ["Process Engineer", "R&D Scientist", "Energy Consultant"], ["Chemistry", "Math"], "Steady demand in oil & gas, pharma, FMCG and green hydrogen.", ["jee-main", "jee-advanced"]),
    ("biotechnology", "Biotechnology", "B.Tech", "Engineering", 4, "Medium", 5, "Genetics, molecular biology, bioprocess engineering and bioinformatics.", ["Biotech Researcher", "Bioinformatician", "Pharma QA"], ["Biology", "Chemistry", "Lab skills"], "Growth in pharma, vaccines and agri-biotech; research-oriented path.", ["jee-main", "jee-advanced", "viteee"]),
    ("aerospace-engineering", "Aerospace Engineering", "B.Tech", "Engineering", 4, "High", 8, "Aerodynamics, propulsion, flight mechanics, structures and avionics.", ["Aerospace Engineer", "ISRO/DRDO Scientist", "Defence R&D"], ["Physics", "Math", "CAD"], "Private space sector and defence indigenisation expanding opportunities.", ["jee-advanced", "jee-main"]),
    ("mathematics-computing", "Mathematics & Computing", "B.Tech", "Engineering", 4, "High", 13, "Pure & applied mathematics, algorithms, finance, cryptography and computing.", ["Quant Analyst", "Software Engineer", "Data Scientist"], ["Advanced math", "Programming"], "Top quant and trading firms recruit heavily from this branch.", ["jee-advanced", "jee-main"]),
    ("metallurgical-engineering", "Metallurgical & Materials Engineering", "B.Tech", "Engineering", 4, "Medium", 6, "Physical metallurgy, materials science, extraction and nanomaterials.", ["Materials Engineer", "R&D Scientist", "Steel/PSU Engineer"], ["Chemistry", "Physics"], "Battery materials and semiconductors opening new scope.", ["jee-advanced", "jee-main"]),
    ("production-industrial", "Production & Industrial Engineering", "B.Tech", "Engineering", 4, "Medium", 6.5, "Operations research, supply chain, manufacturing systems and quality.", ["Operations Manager", "Supply Chain Analyst", "Consultant"], ["Analytical", "Management"], "Good path toward consulting and MBA.", ["jee-advanced", "jee-main"]),
    ("mbbs", "MBBS", "MBBS", "Medicine", 5.5, "Very High", 9, "Anatomy, physiology, biochemistry, pathology, pharmacology, medicine, surgery and clinical rotations.", ["Doctor", "Surgeon (post PG)", "Medical Researcher", "Public Health"], ["Biology", "Empathy", "Stamina"], "Lifelong demand; PG specialisation determines earnings.", ["neet"]),
    ("bds", "BDS (Dental Surgery)", "BDS", "Medicine", 5, "High", 5, "Oral anatomy, dental materials, prosthodontics, orthodontics and oral surgery.", ["Dentist", "Orthodontist", "Dental Researcher"], ["Biology", "Precision"], "Private practice driven; cosmetic dentistry is growing.", ["neet"]),
    ("bsc-nursing", "B.Sc Nursing", "B.Sc", "Medicine", 4, "Medium", 4, "Fundamentals of nursing, pharmacology, community health and clinical practice.", ["Staff Nurse", "Nurse Practitioner", "Healthcare Admin"], ["Biology", "Care", "Communication"], "Massive global demand; strong overseas opportunities.", ["neet"]),
    ("b-pharm", "B.Pharm", "B.Pharm", "Medicine", 4, "Medium", 4.5, "Pharmaceutics, pharmacology, medicinal chemistry and regulatory affairs.", ["Pharmacist", "Drug Safety Associate", "Regulatory Analyst"], ["Chemistry", "Biology"], "India is the pharmacy of the world; steady demand.", ["neet", "mht-cet", "kcet"]),
    ("ba-llb", "BA LLB (Hons)", "BA LLB", "Law", 5, "High", 8, "Constitutional law, contracts, criminal law, corporate law, jurisprudence and moot courts.", ["Corporate Lawyer", "Litigator", "Judge (via judiciary exam)", "Policy Analyst"], ["Reading", "Reasoning", "Writing"], "Top NLU graduates join tier-1 law firms at ₹15–20 LPA.", ["clat"]),
    ("bba-llb", "BBA LLB (Hons)", "BBA LLB", "Law", 5, "High", 7.5, "Business law, management fundamentals, taxation and corporate governance.", ["Corporate Counsel", "Compliance Officer", "Legal Consultant"], ["Business acumen", "Reasoning"], "Preferred by students targeting corporate legal roles.", ["clat"]),
    ("bba", "BBA", "BBA", "Management", 3, "Medium", 5, "Management principles, marketing, finance, HR, business analytics.", ["Business Analyst", "Marketing Executive", "Entrepreneur"], ["Communication", "Numbers"], "Good foundation for MBA; outcomes depend heavily on college.", ["cuet", "ipmat"]),
    ("ipm", "Integrated Programme in Management (IPM)", "BBA+MBA", "Management", 5, "High", 25, "Five-year integrated BBA + MBA from IIMs with liberal arts, analytics and management core.", ["Management Consultant", "Product Manager", "Investment Banker"], ["Aptitude", "Leadership"], "Direct route to an IIM MBA after Class 12.", ["ipmat"]),
    ("mba", "MBA / PGDM", "MBA", "Management", 2, "High", 20, "Strategy, finance, marketing, operations, analytics and leadership.", ["Consultant", "Product Manager", "Finance Manager"], ["Analytical", "Leadership", "Communication"], "Top IIM packages exceed ₹30 LPA.", ["cat"]),
    ("b-des", "B.Des (Design)", "B.Des", "Design", 4, "High", 7, "Design thinking, visual communication, product/UX design, prototyping.", ["UX Designer", "Product Designer", "Fashion Designer", "Design Lead"], ["Creativity", "Sketching", "Empathy"], "UX/UI demand soaring in tech; fashion/industrial design steady.", ["uceed", "nid-dat", "nift"]),
    ("b-arch", "B.Arch (Architecture)", "B.Arch", "Design", 5, "High", 5.5, "Architectural design, building technology, urban planning, sustainability.", ["Architect", "Urban Designer", "Interior Designer"], ["Drawing", "Spatial thinking"], "Sustainable architecture and smart cities driving growth.", ["jee-main"]),
    ("bcom-hons", "B.Com (Hons)", "B.Com", "Commerce", 3, "Medium", 5, "Accounting, taxation, corporate finance, economics and business law.", ["Chartered Accountant (with CA)", "Financial Analyst", "Auditor"], ["Numbers", "Attention to detail"], "Pairs well with CA/CFA for high earnings.", ["cuet"]),
    ("ba-economics", "BA (Hons) Economics", "BA", "Arts", 3, "High", 7, "Microeconomics, macroeconomics, econometrics, development and public policy.", ["Economist", "Policy Analyst", "Consultant", "Data Analyst"], ["Math", "Analytical writing"], "Strong launchpad for consulting, policy and MBA.", ["cuet"]),
    ("ba-english", "BA (Hons) English", "BA", "Arts", 3, "Medium", 4.5, "Literature, critical theory, creative writing, linguistics and media studies.", ["Content Strategist", "Journalist", "Civil Services", "Academia"], ["Reading", "Writing"], "Content and communication roles across industries.", ["cuet"]),
    ("bsc-physics", "B.Sc (Hons) Physics", "B.Sc", "Science", 3, "High", 5, "Classical & quantum mechanics, electromagnetism, thermodynamics and computational physics.", ["Research Scientist", "Data Scientist", "Educator"], ["Math", "Curiosity"], "Research and quant finance via MSc/PhD routes.", ["cuet"]),
    ("bsc-mathematics", "B.Sc (Hons) Mathematics", "B.Sc", "Science", 3, "High", 5.5, "Analysis, algebra, probability, statistics, numerical methods.", ["Data Scientist", "Actuary", "Quant", "Teacher"], ["Abstract reasoning"], "Actuarial and data roles pay very well with add-on skills.", ["cuet"]),
]

# slug, name, short, city, state, type, nirf, est, fee_annual, hostel_fee, avg, highest, place_rate, campus_acres, courses{slug:(exam, general_closing)}
COLLEGES = [
    ("iit-delhi", "Indian Institute of Technology Delhi", "IIT Delhi", "New Delhi", "Delhi", "Government", 2, 1961, 250000, 60000, 18.5, 120, 94, 325, {"computer-science-engineering": ("jee-advanced", 125), "mathematics-computing": ("jee-advanced", 350), "electrical-engineering": ("jee-advanced", 1100), "mechanical-engineering": ("jee-advanced", 2800), "chemical-engineering": ("jee-advanced", 4200), "civil-engineering": ("jee-advanced", 6200)}),
    ("iit-bombay", "Indian Institute of Technology Bombay", "IIT Bombay", "Mumbai", "Maharashtra", "Government", 3, 1958, 250000, 65000, 21.8, 370, 95, 550, {"computer-science-engineering": ("jee-advanced", 68), "electrical-engineering": ("jee-advanced", 480), "mechanical-engineering": ("jee-advanced", 1900), "aerospace-engineering": ("jee-advanced", 2900), "chemical-engineering": ("jee-advanced", 3500), "metallurgical-engineering": ("jee-advanced", 5800)}),
    ("iit-madras", "Indian Institute of Technology Madras", "IIT Madras", "Chennai", "Tamil Nadu", "Government", 1, 1959, 250000, 55000, 19.6, 198, 93, 617, {"computer-science-engineering": ("jee-advanced", 160), "electrical-engineering": ("jee-advanced", 1000), "aerospace-engineering": ("jee-advanced", 3200), "mechanical-engineering": ("jee-advanced", 2600), "chemical-engineering": ("jee-advanced", 4800), "biotechnology": ("jee-advanced", 7500)}),
    ("iit-kanpur", "Indian Institute of Technology Kanpur", "IIT Kanpur", "Kanpur", "Uttar Pradesh", "Government", 4, 1959, 250000, 50000, 17.2, 190, 92, 1055, {"computer-science-engineering": ("jee-advanced", 240), "mathematics-computing": ("jee-advanced", 700), "electrical-engineering": ("jee-advanced", 1400), "mechanical-engineering": ("jee-advanced", 3300), "aerospace-engineering": ("jee-advanced", 4000), "civil-engineering": ("jee-advanced", 7800)}),
    ("iit-kharagpur", "Indian Institute of Technology Kharagpur", "IIT KGP", "Kharagpur", "West Bengal", "Government", 5, 1951, 250000, 45000, 16.5, 260, 90, 2100, {"computer-science-engineering": ("jee-advanced", 400), "electrical-engineering": ("jee-advanced", 2000), "mechanical-engineering": ("jee-advanced", 4000), "civil-engineering": ("jee-advanced", 9000), "biotechnology": ("jee-advanced", 11000), "metallurgical-engineering": ("jee-advanced", 9500)}),
    ("nit-trichy", "National Institute of Technology Tiruchirappalli", "NIT Trichy", "Tiruchirappalli", "Tamil Nadu", "Government", 9, 1964, 160000, 45000, 13.2, 52, 91, 800, {"computer-science-engineering": ("jee-main", 1100), "electronics-communication": ("jee-main", 2600), "electrical-engineering": ("jee-main", 4500), "mechanical-engineering": ("jee-main", 8500), "civil-engineering": ("jee-main", 16000), "chemical-engineering": ("jee-main", 12500), "production-industrial": ("jee-main", 19000)}),
    ("nit-warangal", "National Institute of Technology Warangal", "NIT Warangal", "Warangal", "Telangana", "Government", 21, 1959, 160000, 42000, 12.8, 88, 89, 248, {"computer-science-engineering": ("jee-main", 1900), "electronics-communication": ("jee-main", 4200), "electrical-engineering": ("jee-main", 7500), "mechanical-engineering": ("jee-main", 13000), "civil-engineering": ("jee-main", 22000), "metallurgical-engineering": ("jee-main", 32000), "biotechnology": ("jee-main", 35000)}),
    ("nit-surathkal", "National Institute of Technology Karnataka Surathkal", "NITK Surathkal", "Mangaluru", "Karnataka", "Government", 17, 1960, 160000, 40000, 14.1, 55, 90, 295, {"computer-science-engineering": ("jee-main", 1600), "ai-machine-learning": ("jee-main", 2400), "electronics-communication": ("jee-main", 3900), "electrical-engineering": ("jee-main", 7800), "mechanical-engineering": ("jee-main", 14000), "information-technology": ("jee-main", 2700), "chemical-engineering": ("jee-main", 20000)}),
    ("iiit-hyderabad", "International Institute of Information Technology Hyderabad", "IIIT Hyderabad", "Hyderabad", "Telangana", "Private", 47, 1998, 400000, 80000, 31.0, 110, 98, 66, {"computer-science-engineering": ("jee-main", 650), "electronics-communication": ("jee-main", 1800)}),
    ("iiit-delhi", "Indraprastha Institute of Information Technology Delhi", "IIIT Delhi", "New Delhi", "Delhi", "Government", 65, 2008, 400000, 70000, 22.0, 85, 96, 25, {"computer-science-engineering": ("jee-main", 3000), "ai-machine-learning": ("jee-main", 3800), "electronics-communication": ("jee-main", 7000), "data-science": ("jee-main", 4500)}),
    ("bits-pilani", "Birla Institute of Technology and Science Pilani", "BITS Pilani", "Pilani", "Rajasthan", "Deemed", 20, 1964, 590000, 95000, 19.7, 60, 92, 328, {"computer-science-engineering": ("bitsat", 327), "electronics-communication": ("bitsat", 296), "electrical-engineering": ("bitsat", 285), "mechanical-engineering": ("bitsat", 258), "chemical-engineering": ("bitsat", 242), "mathematics-computing": ("bitsat", 318)}),
    ("vit-vellore", "Vellore Institute of Technology", "VIT Vellore", "Vellore", "Tamil Nadu", "Deemed", 11, 1984, 198000, 110000, 9.2, 88, 85, 372, {"computer-science-engineering": ("viteee", 9000), "ai-machine-learning": ("viteee", 14000), "electronics-communication": ("viteee", 28000), "information-technology": ("viteee", 16000), "mechanical-engineering": ("viteee", 60000), "biotechnology": ("viteee", 80000)}),
    ("dtu", "Delhi Technological University", "DTU", "New Delhi", "Delhi", "Government", 27, 1941, 219000, 60000, 15.4, 82, 88, 164, {"computer-science-engineering": ("jee-main", 3800), "information-technology": ("jee-main", 5500), "electronics-communication": ("jee-main", 8500), "electrical-engineering": ("jee-main", 13000), "mechanical-engineering": ("jee-main", 24000), "civil-engineering": ("jee-main", 38000)}),
    ("nsut", "Netaji Subhas University of Technology", "NSUT", "New Delhi", "Delhi", "Government", 57, 1983, 195000, 55000, 14.0, 60, 86, 145, {"computer-science-engineering": ("jee-main", 4800), "information-technology": ("jee-main", 7200), "electronics-communication": ("jee-main", 10500), "electrical-engineering": ("jee-main", 16000), "mechanical-engineering": ("jee-main", 29000)}),
    ("jadavpur-university", "Jadavpur University", "Jadavpur", "Kolkata", "West Bengal", "Government", 12, 1955, 10000, 20000, 11.5, 60, 85, 58, {"computer-science-engineering": ("wbjee", 180), "information-technology": ("wbjee", 420), "electronics-communication": ("wbjee", 650), "electrical-engineering": ("wbjee", 1100), "mechanical-engineering": ("wbjee", 2200), "civil-engineering": ("wbjee", 3800)}),
    ("coep-pune", "COEP Technological University", "COEP Pune", "Pune", "Maharashtra", "Government", 73, 1854, 105000, 45000, 9.8, 51, 84, 37, {"computer-science-engineering": ("mht-cet", 99.6), "information-technology": ("mht-cet", 99.3), "electronics-communication": ("mht-cet", 98.9), "mechanical-engineering": ("mht-cet", 97.8), "civil-engineering": ("mht-cet", 96.5)}),
    ("rvce-bangalore", "RV College of Engineering", "RVCE", "Bengaluru", "Karnataka", "Private", 96, 1963, 280000, 90000, 10.5, 58, 87, 52, {"computer-science-engineering": ("kcet", 420), "ai-machine-learning": ("kcet", 850), "information-technology": ("kcet", 1100), "electronics-communication": ("kcet", 1900), "mechanical-engineering": ("kcet", 9000)}),
    ("srm-chennai", "SRM Institute of Science and Technology", "SRM Chennai", "Chennai", "Tamil Nadu", "Deemed", 13, 1985, 260000, 120000, 7.2, 52, 80, 250, {"computer-science-engineering": ("srmjeee", 12000), "ai-machine-learning": ("srmjeee", 20000), "information-technology": ("srmjeee", 25000), "electronics-communication": ("srmjeee", 40000), "mechanical-engineering": ("srmjeee", 70000)}),
    ("aiims-delhi", "All India Institute of Medical Sciences Delhi", "AIIMS Delhi", "New Delhi", "Delhi", "Government", 1, 1956, 6000, 12000, 12.0, 30, 100, 200, {"mbbs": ("neet", 705), "bsc-nursing": ("neet", 560)}),
    ("mamc-delhi", "Maulana Azad Medical College", "MAMC", "New Delhi", "Delhi", "Government", 12, 1958, 15000, 18000, 10.0, 25, 100, 122, {"mbbs": ("neet", 688), "bds": ("neet", 630)}),
    ("cmc-vellore", "Christian Medical College Vellore", "CMC Vellore", "Vellore", "Tamil Nadu", "Private", 3, 1900, 55000, 30000, 10.5, 24, 100, 200, {"mbbs": ("neet", 680), "bsc-nursing": ("neet", 520), "bds": ("neet", 600)}),
    ("kgmu-lucknow", "King George's Medical University", "KGMU", "Lucknow", "Uttar Pradesh", "Government", 22, 1905, 55000, 20000, 9.0, 20, 100, 100, {"mbbs": ("neet", 665), "bds": ("neet", 610), "b-pharm": ("neet", 450)}),
    ("nlsiu-bangalore", "National Law School of India University", "NLSIU", "Bengaluru", "Karnataka", "Government", 1, 1987, 320000, 90000, 18.0, 30, 95, 23, {"ba-llb": ("clat", 110)}),
    ("nalsar-hyderabad", "NALSAR University of Law", "NALSAR", "Hyderabad", "Telangana", "Government", 3, 1998, 300000, 85000, 16.0, 26, 94, 55, {"ba-llb": ("clat", 230)}),
    ("nlu-delhi", "National Law University Delhi", "NLU Delhi", "New Delhi", "Delhi", "Government", 2, 2008, 230000, 70000, 15.0, 22, 93, 12, {"ba-llb": ("clat", 400), "bba-llb": ("clat", 900)}),
    ("st-stephens", "St. Stephen's College, Delhi University", "St. Stephen's", "New Delhi", "Delhi", "Government", 6, 1881, 42000, 60000, 8.0, 35, 80, 69, {"ba-economics": ("cuet", 785), "bsc-physics": ("cuet", 765), "bsc-mathematics": ("cuet", 770), "ba-english": ("cuet", 760)}),
    ("srcc-delhi", "Shri Ram College of Commerce", "SRCC", "New Delhi", "Delhi", "Government", 4, 1926, 32000, 50000, 11.0, 40, 85, 10, {"bcom-hons": ("cuet", 790), "ba-economics": ("cuet", 788)}),
    ("hindu-college", "Hindu College, Delhi University", "Hindu College", "New Delhi", "Delhi", "Government", 1, 1899, 25000, 45000, 7.5, 32, 78, 25, {"ba-economics": ("cuet", 778), "bcom-hons": ("cuet", 775), "ba-english": ("cuet", 755), "bsc-physics": ("cuet", 758), "bsc-mathematics": ("cuet", 760)}),
    ("iim-indore", "Indian Institute of Management Indore", "IIM Indore", "Indore", "Madhya Pradesh", "Government", 8, 1996, 500000, 120000, 25.0, 100, 100, 193, {"ipm": ("ipmat", 300), "mba": ("cat", 97.5)}),
    ("iim-ahmedabad", "Indian Institute of Management Ahmedabad", "IIM Ahmedabad", "Ahmedabad", "Gujarat", "Government", 1, 1961, 1250000, 150000, 34.5, 115, 100, 102, {"mba": ("cat", 99.0)}),
    ("nift-delhi", "National Institute of Fashion Technology Delhi", "NIFT Delhi", "New Delhi", "Delhi", "Government", 1, 1986, 300000, 70000, 6.5, 20, 82, 14, {"b-des": ("nift", 450)}),
    ("nid-ahmedabad", "National Institute of Design Ahmedabad", "NID Ahmedabad", "Ahmedabad", "Gujarat", "Government", 1, 1961, 380000, 60000, 8.5, 25, 85, 20, {"b-des": ("nid-dat", 90)}),
    ("spa-delhi", "School of Planning and Architecture Delhi", "SPA Delhi", "New Delhi", "Delhi", "Government", 2, 1941, 60000, 40000, 6.0, 15, 80, 10, {"b-arch": ("jee-main", 60)}),
    ("mnit-jaipur", "Malaviya National Institute of Technology Jaipur", "MNIT Jaipur", "Jaipur", "Rajasthan", "Government", 43, 1963, 160000, 40000, 11.0, 48, 86, 312, {"computer-science-engineering": ("jee-main", 5200), "electronics-communication": ("jee-main", 9800), "electrical-engineering": ("jee-main", 15000), "mechanical-engineering": ("jee-main", 24000), "civil-engineering": ("jee-main", 36000), "chemical-engineering": ("jee-main", 32000), "metallurgical-engineering": ("jee-main", 45000)}),
    ("nit-calicut", "National Institute of Technology Calicut", "NIT Calicut", "Kozhikode", "Kerala", "Government", 25, 1961, 160000, 38000, 11.8, 50, 87, 300, {"computer-science-engineering": ("jee-main", 4200), "electronics-communication": ("jee-main", 8800), "electrical-engineering": ("jee-main", 14500), "mechanical-engineering": ("jee-main", 22000), "civil-engineering": ("jee-main", 35000), "chemical-engineering": ("jee-main", 30000), "biotechnology": ("jee-main", 48000)}),
    ("nit-durgapur", "National Institute of Technology Durgapur", "NIT Durgapur", "Durgapur", "West Bengal", "Government", 44, 1960, 160000, 36000, 9.5, 42, 82, 187, {"computer-science-engineering": ("jee-main", 11000), "electronics-communication": ("jee-main", 19000), "electrical-engineering": ("jee-main", 27000), "mechanical-engineering": ("jee-main", 38000), "civil-engineering": ("jee-main", 52000), "biotechnology": ("jee-main", 68000), "metallurgical-engineering": ("jee-main", 60000)}),
    ("iiit-allahabad", "Indian Institute of Information Technology Allahabad", "IIIT Allahabad", "Prayagraj", "Uttar Pradesh", "Government", 87, 1999, 230000, 45000, 16.5, 65, 90, 100, {"information-technology": ("jee-main", 5800), "electronics-communication": ("jee-main", 11500)}),
    ("thapar-patiala", "Thapar Institute of Engineering and Technology", "Thapar", "Patiala", "Punjab", "Deemed", 29, 1956, 390000, 110000, 11.9, 55, 88, 250, {"computer-science-engineering": ("jee-main", 28000), "electronics-communication": ("jee-main", 60000), "mechanical-engineering": ("jee-main", 120000), "electrical-engineering": ("jee-main", 95000), "civil-engineering": ("jee-main", 180000)}),
    ("manipal-mit", "Manipal Institute of Technology", "MIT Manipal", "Manipal", "Karnataka", "Deemed", 61, 1957, 450000, 130000, 9.8, 60, 85, 188, {"computer-science-engineering": ("jee-main", 40000), "information-technology": ("jee-main", 55000), "electronics-communication": ("jee-main", 80000), "ai-machine-learning": ("jee-main", 50000), "mechanical-engineering": ("jee-main", 160000)}),
    ("nit-rourkela", "National Institute of Technology Rourkela", "NIT Rourkela", "Rourkela", "Odisha", "Government", 16, 1961, 160000, 36000, 12.5, 56, 88, 648, {"computer-science-engineering": ("jee-main", 3900), "electronics-communication": ("jee-main", 8200), "electrical-engineering": ("jee-main", 13500), "mechanical-engineering": ("jee-main", 20000), "civil-engineering": ("jee-main", 33000), "biotechnology": ("jee-main", 42000), "chemical-engineering": ("jee-main", 28000)}),
]

RECRUITERS = ["Google", "Microsoft", "Amazon", "Goldman Sachs", "Qualcomm", "Texas Instruments", "Tata Steel", "L&T", "Deloitte", "McKinsey", "Flipkart", "Samsung R&D"]
FACILITIES = ["Central Library", "Wi-Fi Campus", "Sports Complex", "Hostels", "Medical Centre", "Innovation Lab", "Auditorium", "Cafeteria", "Gym", "Incubation Cell"]
STATES = ["Delhi", "Maharashtra", "Tamil Nadu", "Karnataka", "Uttar Pradesh", "West Bengal", "Telangana", "Rajasthan", "Gujarat", "Madhya Pradesh", "Kerala", "Punjab", "Haryana", "Bihar", "Andhra Pradesh", "Odisha", "Assam", "Jharkhand", "Chhattisgarh", "Uttarakhand", "Himachal Pradesh", "Goa"]

SCHOLARSHIPS = [
    ("Central Sector Scholarship Scheme", "Govt of India (MoE)", 20000, "Top 20 percentile in Class 12 board; family income < ₹4.5 LPA", ["General", "OBC", "SC", "ST", "EWS"], "All", 450000, "2026-10-31", ["Income certificate", "Class 12 marksheet", "Aadhaar", "Bank passbook"], "https://scholarships.gov.in"),
    ("Post Matric Scholarship for SC Students", "Ministry of Social Justice", 120000, "SC category; family income < ₹2.5 LPA; covers full tuition + maintenance", ["SC"], "All", 250000, "2026-11-30", ["Caste certificate", "Income certificate", "Admission letter"], "https://scholarships.gov.in"),
    ("Post Matric Scholarship for ST Students", "Ministry of Tribal Affairs", 120000, "ST category; family income < ₹2.5 LPA", ["ST"], "All", 250000, "2026-11-30", ["Tribe certificate", "Income certificate"], "https://scholarships.gov.in"),
    ("Pragati Scholarship for Girls (AICTE)", "AICTE", 50000, "Girl students in AICTE-approved technical institutes; income < ₹8 LPA", ["General", "OBC", "SC", "ST", "EWS"], "Female", 800000, "2026-10-15", ["Income certificate", "Admission letter", "Class 12 marksheet"], "https://www.aicte-pragati-saksham-gov.in"),
    ("Saksham Scholarship (AICTE)", "AICTE", 50000, "Differently-abled students (40%+) in technical education", ["General", "OBC", "SC", "ST", "EWS"], "All", 800000, "2026-10-15", ["Disability certificate", "Income certificate"], "https://www.aicte-pragati-saksham-gov.in"),
    ("Reliance Foundation Undergraduate Scholarship", "Reliance Foundation", 200000, "Merit-cum-means; income < ₹15 LPA; top entrance exam performers", ["General", "OBC", "SC", "ST", "EWS"], "All", 1500000, "2026-10-06", ["Income proof", "Entrance scorecard", "Essay"], "https://www.scholarships.reliancefoundation.org"),
    ("Kishore Vaigyanik Protsahan Yojana / INSPIRE-SHE", "DST", 80000, "Top 1% in Class 12 pursuing basic sciences", ["General", "OBC", "SC", "ST", "EWS"], "All", None, "2026-09-30", ["Class 12 marksheet", "Admission proof in B.Sc"], "https://online-inspire.gov.in"),
    ("Merit-cum-Means Scholarship (IITs)", "IIT System", 250000, "Family income < ₹5 LPA at IITs; full tuition waiver + pocket allowance", ["General", "OBC", "SC", "ST", "EWS"], "All", 500000, "2026-08-31", ["Income certificate", "IIT admission letter"], "https://josaa.nic.in"),
    ("Sitaram Jindal Foundation Scholarship", "Sitaram Jindal Foundation", 36000, "Students with 65%+ marks; income < ₹4 LPA", ["General", "OBC", "SC", "ST", "EWS"], "All", 400000, "2026-12-15", ["Marksheet", "Income certificate"], "https://www.sitaramjindalfoundation.org"),
    ("HDFC Badhte Kadam Scholarship", "HDFC Bank Parivartan", 75000, "UG students facing financial crisis; income < ₹2.5 LPA", ["General", "OBC", "SC", "ST", "EWS"], "All", 250000, "2026-09-30", ["Income certificate", "Fee receipt"], "https://www.hdfcbankecss.com"),
    ("Tata Scholarship for Medical Students", "Tata Trusts", 100000, "MBBS students from govt medical colleges; need-based", ["General", "OBC", "SC", "ST", "EWS"], "All", 600000, "2026-08-20", ["Admission letter", "Income certificate"], "https://www.tatatrusts.org"),
    ("CLAT Consortium Fee Waiver", "NLU Consortium", 150000, "Students from economically weaker backgrounds admitted to NLUs", ["General", "OBC", "SC", "ST", "EWS"], "All", 300000, "2026-07-31", ["Income certificate", "Allotment letter"], "https://consortiumofnlus.ac.in"),
]

DEADLINES = [
    ("JoSAA Counselling Registration", "jee-main", "2026-06-10", "counseling", "Register and fill choices for IITs, NITs, IIITs & GFTIs"),
    ("JoSAA Round 1 Seat Allotment", "jee-main", "2026-06-20", "result", "First round allotment result"),
    ("JoSAA Document Verification", "jee-main", "2026-06-25", "document", "Upload documents and pay seat acceptance fee"),
    ("CSAB Special Rounds", "jee-main", "2026-07-25", "counseling", "Vacant seats in NITs/IIITs/GFTIs"),
    ("NEET MCC Counselling Round 1", "neet", "2026-07-15", "counseling", "All India Quota registration"),
    ("NEET State Quota Counselling", "neet", "2026-07-25", "counseling", "State-level 85% quota counselling"),
    ("CUET Result Declaration", "cuet", "2026-07-05", "result", "NTA declares CUET UG results"),
    ("DU CSAS Phase 2 Preference Filling", "cuet", "2026-07-20", "application", "Fill college-course preferences on DU CSAS portal"),
    ("CLAT Counselling Round 3", "clat", "2026-06-30", "counseling", "Final NLU counselling round"),
    ("BITSAT Iteration 1 Admit List", "bitsat", "2026-07-02", "result", "First admission list"),
    ("IPMAT Final Result", "ipmat", "2026-06-28", "result", "IIM Indore IPM final selection"),
    ("Central Sector Scholarship Window", None, "2026-10-31", "scholarship", "NSP portal application window closes"),
]

KNOWLEDGE = [
    ("JoSAA counselling process", "JoSAA (Joint Seat Allocation Authority) conducts 5 rounds of seat allocation for IITs, NITs, IIITs and GFTIs based on JEE Main and JEE Advanced ranks. Candidates register, fill and lock choices, then receive allotments round by round. After allotment they must pay the seat acceptance fee and complete document verification online. Options: Freeze (accept and exit), Float (accept but consider higher preference in later rounds), Slide (accept but consider higher preference within same institute). CSAB conducts special rounds for leftover NIT+ seats."),
    ("NEET counselling (MCC and State)", "15% of government MBBS seats are All India Quota (AIQ) counselled by MCC; 85% are State Quota counselled by state authorities. Deemed universities, central universities, AIIMS and JIPMER seats are 100% via MCC. Rounds: Round 1, Round 2, Mop-up, Stray Vacancy."),
    ("Documents required for engineering counselling", "Class 10 and 12 marksheets & certificates, JEE Main/Advanced scorecard & rank card, Aadhaar, category certificate (OBC-NCL/EWS issued after 1 April of the admission year; SC/ST), PwD certificate if applicable, domicile certificate for home-state quota, passport photos, seat acceptance fee receipt, medical certificate, transfer & migration certificates at the time of reporting."),
    ("Home state quota in NITs", "NITs reserve 50% seats for Home State (HS) candidates — students who passed Class 12 from that state. HS cutoffs are usually more relaxed than Other State (OS) cutoffs for the same branch."),
    ("CSE vs ECE decision", "CSE offers the broadest software opportunities and highest median packages. ECE gives flexibility: core electronics/VLSI (growing with the India Semiconductor Mission) plus software roles since most IT recruiters hire ECE too. If a student is sure about software, choose CSE at a comparable college; if torn between a lower-ranked college CSE and a top college ECE, the top college ECE often wins on brand, peer group and flexibility."),
    ("Category cutoff relaxation", "Typical JoSAA closing rank relaxation vs General: EWS ~1.2–1.4x, OBC-NCL ~1.7–2.2x, SC ~4–6x, ST ~7–10x. Female supernumerary seats have separate (higher) closing ranks in IITs and NITs."),
]


def _cat_factor(cat, metric):
    if metric == "rank":
        return {"General": 1.0, "EWS": 1.3, "OBC-NCL": 1.9, "SC": 5.0, "ST": 8.0}[cat]
    return {"General": 1.0, "EWS": 0.975, "OBC-NCL": 0.95, "SC": 0.85, "ST": 0.78}[cat]


async def seed():
    if await db.colleges.count_documents({}) > 0:
        return
    rnd = random.Random(42)
    exam_docs = []
    for s, n, sh, mt, tot, smax, body, streams, desc, dates in EXAMS:
        exam_docs.append({"id": s, "slug": s, "name": n, "short_name": sh, "metric_type": mt, "total_candidates": tot, "score_max": smax, "conducting_body": body, "streams": streams, "description": desc, "important_dates": dates, "data_updated": "2025", "demo": True, "created_at": now_iso()})
    await db.exams.insert_many(exam_docs)

    course_docs = []
    for s, n, deg, stream, dur, diff, sal, what, careers, skills, scope, exams in COURSES:
        course_docs.append({"id": s, "slug": s, "name": n, "degree": deg, "stream": stream, "duration_years": dur, "difficulty": diff, "avg_salary_lpa": sal, "what_you_study": what, "careers": careers, "skills": skills, "future_scope": scope, "exams": exams, "ai_recommendation": f"Choose {n} if you enjoy {skills[0].lower()} and want careers like {careers[0]} or {careers[1]}.", "demo": True, "created_at": now_iso()})
    await db.courses.insert_many(course_docs)

    exam_by = {e["id"]: e for e in exam_docs}
    col_docs, cutoff_docs = [], []
    for i, (slug, name, short, city, state, ctype, nirf, est, fee, hostel, avg, high, prate, acres, courses) in enumerate(COLLEGES):
        course_list, exams = [], set()
        for cs, (ex, base) in courses.items():
            exams.add(ex)
            cfee = fee if ctype != "Private" or cs not in ("mbbs",) else fee
            course_list.append({"course_id": cs, "exam_id": ex, "seats": rnd.choice([40, 60, 90, 120, 150]), "fee_annual": cfee, "duration_years": next(c[4] for c in COURSES if c[0] == cs)})
            metric = "score" if exam_by[ex]["metric_type"] == "score" else "rank"
            for cat in ["General", "EWS", "OBC-NCL", "SC", "ST"]:
                f = _cat_factor(cat, metric)
                for yi, year in enumerate([2023, 2024, 2025]):
                    drift = 1 + (yi - 1) * (0.06 if metric == "rank" else -0.012) * rnd.uniform(0.6, 1.4)
                    closing = base * f * drift
                    if metric == "score" and ex in ("mht-cet", "cat"):
                        closing = min(99.99, base - (1 - f) * 30 + (yi - 1) * 0.15)
                    for rnd_no, rf in [(1, 0.82 if metric == "rank" else 1.02), (5, 1.0)]:
                        c = closing * rf if not (metric == "score" and ex in ("mht-cet", "cat")) else min(99.99, closing + (0.3 if rnd_no == 1 else 0))
                        quotas = ["AI"] if ex not in ("jee-main",) or not slug.startswith("nit") else ["AI", "HS"]
                        for q in quotas:
                            qc = c * (1.45 if q == "HS" and metric == "rank" else 1)
                            cutoff_docs.append({"id": uid("cut_"), "exam_id": ex, "college_id": slug, "course_id": cs, "category": cat, "gender": "all", "quota": q, "year": year, "round": rnd_no, "opening": round(qc * (0.35 if metric == "rank" else 1.03), 2), "closing": round(qc, 2), "metric": metric, "demo": True})
                        if metric == "rank" and ex in ("jee-advanced", "jee-main") and rnd_no == 5:
                            cutoff_docs.append({"id": uid("cut_"), "exam_id": ex, "college_id": slug, "course_id": cs, "category": cat, "gender": "female", "quota": "AI", "year": year, "round": rnd_no, "opening": round(c * 0.6, 2), "closing": round(c * 1.9, 2), "metric": metric, "demo": True})
        col_docs.append({
            "id": slug, "slug": slug, "name": name, "short_name": short, "city": city, "state": state, "type": ctype, "nirf_rank": nirf, "established": est, "accreditation": "NAAC A++" if nirf <= 10 else "NAAC A+", "logo": "".join(w[0] for w in short.split()[:3]).upper(), "image": IMG[i % len(IMG)],
            "fee_annual": fee, "hostel_fee": hostel, "mess_fee": 42000, "avg_package": avg, "highest_package": high, "placement_rate": prate, "campus_acres": acres, "courses": course_list, "exams": sorted(exams),
            "recruiters": rnd.sample(RECRUITERS, 6), "facilities": rnd.sample(FACILITIES, 7), "website": f"https://www.{slug.replace('-', '')}.ac.in", "email": f"admissions@{slug.replace('-', '')}.ac.in", "phone": f"+91-{rnd.randint(11, 99)}-{rnd.randint(20000000, 29999999)}",
            "about": f"{name} is a {ctype.lower()} institution established in {est} in {city}, {state}. It is ranked #{nirf} in its NIRF category and is known for strong academics, research output and a vibrant campus spread over {acres} acres.",
            "admission_process": "Admission is through the accepted entrance exam(s) followed by centralized counselling / institute-level seat allocation. Candidates fill choices, receive allotment, pay seat acceptance fee and complete document verification.",
            "important_dates": {"Application Opens": "Mar 2026", "Counselling": "Jun–Jul 2026", "Classes Begin": "Aug 2026"},
            "scholarships": ["Merit-cum-Means", "Institute Fee Waiver (income < ₹5 LPA)", "Central Sector Scholarship"],
            "hostel": {"available": True, "fee_annual": hostel, "rooms": "Single/Double sharing", "mess": "Veg & non-veg mess, ₹3,500/month"},
            "rating": round(rnd.uniform(4.0, 4.8), 1), "reviews": [
                {"name": "Aarav S.", "rating": 5, "text": "Great peer group and placements. Hostel life is memorable.", "year": 2025},
                {"name": "Priya M.", "rating": 4, "text": "Academics are rigorous; faculty are supportive. Mess food could be better.", "year": 2024},
            ],
            "faqs": [
                {"q": f"What is the fee at {short}?", "a": f"The approximate tuition fee is ₹{fee:,}/year with hostel around ₹{hostel:,}/year."},
                {"q": f"What is the average package at {short}?", "a": f"The average package is around ₹{avg} LPA with a highest package of ₹{high} LPA."},
                {"q": "Is hostel compulsory?", "a": "Hostel is available for all first-year students; it is not compulsory for local students."},
            ],
            "demo": True, "sponsored": False, "created_at": now_iso(),
        })
    await db.colleges.insert_many(col_docs)
    await db.cutoffs.insert_many(cutoff_docs)

    await db.scholarships.insert_many([{"id": uid("sch_"), "name": n, "provider": p, "amount": amt, "eligibility": el, "categories": cats, "gender": g, "max_income": inc, "deadline": rel(dl), "documents": docs, "link": link, "status": "Open", "demo": True, "created_at": now_iso()} for n, p, amt, el, cats, g, inc, dl, docs, link in SCHOLARSHIPS])
    await db.deadlines.insert_many([{"id": uid("dl_"), "title": t, "exam_id": e, "date": rel(d), "kind": k, "description": desc, "demo": True, "created_at": now_iso()} for t, e, d, k, desc in DEADLINES])
    await db.knowledge.insert_many([{"id": uid("kb_"), "title": t, "content": c, "tags": [], "demo": True, "created_at": now_iso()} for t, c in KNOWLEDGE])

    for coll, keys in [("cutoffs", [[("exam_id", 1), ("category", 1)], [("college_id", 1), ("course_id", 1)]]), ("colleges", [[("slug", 1)], [("state", 1)], [("type", 1)]]), ("courses", [[("slug", 1)]]), ("user_sessions", [[("session_token", 1)]]), ("users", [[("email", 1)], [("user_id", 1)]]), ("events", [[("event", 1), ("created_at", -1)]]), ("saved_colleges", [[("user_id", 1)]]), ("applications", [[("user_id", 1)]]), ("notifications", [[("user_id", 1), ("created_at", -1)]]), ("ai_messages", [[("conversation_id", 1), ("created_at", 1)]])]:
        for k in keys:
            await db[coll].create_index(k)

    # demo student
    if not await db.users.find_one({"email": "student@demo.com"}):
        sid = uid("user_")
        await db.users.insert_one({"user_id": sid, "email": "student@demo.com", "name": "Ananya Sharma", "picture": None, "role": "student", "provider": "email", "password_hash": hash_pw("Student@123"), "onboarded": True, "plan": "free", "created_at": now_iso()})
        await db.student_profiles.insert_one({"user_id": sid, "class_year": "Class 12 (2026)", "city": "Jaipur", "state": "Rajasthan", "home_state": "Rajasthan", "preferred_states": ["Delhi", "Rajasthan", "Any"], "exam_id": "jee-main", "percentile": 96.2, "rank": None, "score": None, "category": "General", "gender": "Female", "preferred_courses": ["Computer Science", "Electronics"], "college_type": "Any", "budget": 300000, "hostel_required": True, "priorities": ["Placements", "Reputation"], "career_goal": "Software engineer at a product company", "board_percentage": 91.5, "demo": True, "updated_at": now_iso()})
        await db.saved_colleges.insert_many([
            {"id": uid("sv_"), "user_id": sid, "college_id": "nit-trichy", "course_id": "computer-science-engineering", "bucket": "dream", "created_at": now_iso()},
            {"id": uid("sv_"), "user_id": sid, "college_id": "dtu", "course_id": "computer-science-engineering", "bucket": "target", "created_at": now_iso()},
            {"id": uid("sv_"), "user_id": sid, "college_id": "nsut", "course_id": "information-technology", "bucket": "target", "created_at": now_iso()},
            {"id": uid("sv_"), "user_id": sid, "college_id": "vit-vellore", "course_id": "computer-science-engineering", "bucket": "safe", "created_at": now_iso()},
        ])
        await db.applications.insert_many([
            {"id": uid("app_"), "user_id": sid, "title": "JoSAA Counselling Registration", "college_id": None, "kind": "counseling", "status": "In Progress", "deadline": rel("2026-06-10"), "notes": "Fill 40+ choices", "created_at": now_iso()},
            {"id": uid("app_"), "user_id": sid, "title": "VIT Vellore Application", "college_id": "vit-vellore", "kind": "application", "status": "Submitted", "deadline": rel("2026-05-30"), "notes": "", "created_at": now_iso()},
            {"id": uid("app_"), "user_id": sid, "title": "Document Verification", "college_id": None, "kind": "document", "status": "Not Started", "deadline": rel("2026-06-25"), "notes": "", "created_at": now_iso()},
        ])
        await db.documents.insert_many([{"id": uid("doc_"), "user_id": sid, "name": d, "done": d in ("Aadhaar", "Class 10 certificate"), "created_at": now_iso()} for d in ["Aadhaar", "Class 10 certificate", "Class 12 certificate", "Entrance exam scorecard", "Rank card", "Category certificate", "Domicile certificate", "Income certificate", "Passport photos", "Transfer certificate", "Migration certificate"]])
        conv_id = uid("conv_")
        await db.ai_conversations.insert_one({"id": conv_id, "user_id": sid, "title": "Can I get NIT Trichy CSE?", "created_at": now_iso(), "updated_at": now_iso()})
        await db.ai_messages.insert_many([
            {"id": uid("msg_"), "conversation_id": conv_id, "user_id": sid, "role": "user", "content": "I scored 96.2 percentile in JEE Main. Can I get NIT Trichy CSE?", "created_at": now_iso()},
            {"id": uid("msg_"), "conversation_id": conv_id, "user_id": sid, "role": "assistant", "content": "With a **96.2 percentile** (approx. AIR 47,500) in the General category, NIT Trichy CSE (2025 closing ≈ AIR 1,100) is a **Dream** option — admission probability is low. Strong **Target** options for CSE/IT at your percentile include [[college:vit-vellore]] and private NIT+ alternatives, while [[college:dtu]] and [[college:nsut]] would need a Delhi domicile. \n\n**Recommended next step:** add 2–3 safe options to your shortlist.\n\n_Data last updated: 2025. Estimates only — not a guarantee of admission._", "created_at": now_iso()},
        ])
        await db.notifications.insert_many([
            {"id": uid("ntf_"), "user_id": sid, "title": "JoSAA registration opens soon", "body": "Registration for JoSAA 2026 counselling starts on 10 June.", "kind": "deadline", "link": "/tracker", "read": False, "created_at": now_iso()},
            {"id": uid("ntf_"), "user_id": sid, "title": "New scholarship match", "body": "You may be eligible for the AICTE Pragati Scholarship for Girls.", "kind": "scholarship", "link": "/scholarships", "read": False, "created_at": now_iso()},
        ])
