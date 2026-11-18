export const books = [
  { id:'java', code:'TT-JAVA-101', category:'Programming', title:'Java Fundamentals & OOP', author:'Techtroopers Faculty', description:'Java basics, OOP, collections, exceptions and practical programs.', color:'#2370f2', type:'E-book' },
  { id:'python', code:'TT-PY-102', category:'Programming', title:'Python From Basics', author:'Techtroopers Faculty', description:'Python syntax, functions, OOP, files and project-oriented examples.', color:'#7c5cff', type:'E-book' },
  { id:'aiml', code:'TT-AI-201', category:'AI & ML', title:'Artificial Intelligence & Machine Learning', author:'Techtroopers Faculty', description:'Intelligent agents, search, knowledge representation and machine learning.', color:'#e85d9e', type:'Notes' },
  { id:'web', code:'TT-WEB-120', category:'Web Technology', title:'Web Technology Notes', author:'Techtroopers Faculty', description:'HTML, CSS, JavaScript, DOM, Servlets, JSP and Spring Boot.', color:'#f39c3d', type:'Notes' },
  { id:'dbms', code:'TT-DB-130', category:'Database', title:'DBMS Quick Revision', author:'Techtroopers Faculty', description:'ER model, normalization, SQL, transactions and indexing.', color:'#26a269', type:'Notes' },
  { id:'c', code:'TT-C-100', category:'Programming', title:'Master Code Book – C', author:'Techtroopers Faculty', description:'Logic-building programs, control statements, arrays, functions and pointers.', color:'#e55b5b', type:'Code Book' },
];

export const exams = [
  { id:'java-oops', subject:'Java Programming', code:'EXM-JAVA-01', title:'Object Oriented Programming with Java', description:'Java fundamentals, classes, objects, inheritance, polymorphism and exceptions.', questions:20, marks:20, duration:45, level:'Intermediate', status:'Available', startCode:'JAVA2026', category:'Java' },
  { id:'dbms-core', subject:'DBMS', code:'EXM-DBMS-02', title:'Database Management Systems', description:'ER models, relational model, normalization, SQL, transactions and design.', questions:25, marks:25, duration:50, level:'Intermediate', status:'Available', startCode:'DBMS2026', category:'DBMS' },
  { id:'python-basic', subject:'Python', code:'EXM-PYT-03', title:'Python Fundamentals and Programming', description:'Syntax, data types, control structures, functions, collections and OOP.', questions:30, marks:30, duration:60, level:'Beginner', status:'Available', startCode:'PY2026', category:'Python' },
  { id:'web-tech', subject:'Web Technology', code:'EXM-WEB-04', title:'HTML, CSS, JavaScript and Web Basics', description:'HTML structure, CSS styling, JavaScript, DOM and web fundamentals.', questions:20, marks:20, duration:40, level:'Beginner', status:'Available', startCode:'WEB2026', category:'Web Technology' },
  { id:'os-concepts', subject:'Operating System', code:'EXM-OS-05', title:'Operating System Concepts', description:'Processes, scheduling, deadlocks, memory and file systems.', questions:25, marks:25, duration:45, level:'Intermediate', status:'Available', startCode:'OS2026', category:'Operating System' },
  { id:'aiml-unit1', subject:'AI & ML', code:'EXM-AIML-06', title:'Artificial Intelligence and ML Basics', description:'Intelligent agents, uninformed/informed search and ML fundamentals.', questions:20, marks:20, duration:45, level:'Advanced', status:'Available', startCode:'AIML2026', category:'AI & ML' },
  { id:'cn-basics', subject:'Computer Networks', code:'EXM-CN-07', title:'Computer Networks Fundamentals', description:'Models, protocols, addressing, routing, switching and communication.', questions:20, marks:20, duration:35, level:'Intermediate', status:'Available', startCode:'CN2026', category:'Networks' },
  { id:'c-language', subject:'C Language', code:'EXM-C-08', title:'Programming in C', description:'Operators, loops, arrays, functions, pointers and structures.', questions:30, marks:30, duration:60, level:'Beginner', status:'Available', startCode:'C2026', category:'C' },
  { id:'daa', subject:'DAA', code:'EXM-DAA-09', title:'Design and Analysis of Algorithms', description:'Complexity, divide & conquer, greedy, dynamic programming and graph algorithms.', questions:25, marks:25, duration:50, level:'Advanced', status:'Available', startCode:'DAA2026', category:'DAA' },
  { id:'data-structure', subject:'Data Structures', code:'EXM-DS-10', title:'Data Structures and Algorithms', description:'Arrays, linked lists, stacks, queues, trees, graphs, search and sorting.', questions:25, marks:25, duration:50, level:'Intermediate', status:'Available', startCode:'DS2026', category:'DSA' },
  { id:'cloud', subject:'Cloud Computing', code:'EXM-CC-11', title:'Cloud Computing Fundamentals', description:'Cloud concepts, service models, virtualization and architecture.', questions:20, marks:20, duration:40, level:'Intermediate', status:'Upcoming', startCode:'CLOUD2026', category:'Cloud' },
  { id:'cyber-security', subject:'Cyber Security', code:'EXM-CS-12', title:'Cyber Security Essentials', description:'Attacks, encryption, authentication and network security.', questions:25, marks:25, duration:45, level:'Advanced', status:'Available', startCode:'CYBER2026', category:'Cyber Security' }
];

const makeQuestion = (examId, id, question, options, answer, explanation) => ({ id:`${examId}-${id}`, examId, question, options, answer, explanation });
export const questions = [
  makeQuestion('java-oops',1,'Which keyword is used to inherit a class in Java?',['implements','extends','inherits','super'],1,'A class inherits another class with extends.'),
  makeQuestion('java-oops',2,'Which feature allows one interface to have many implementations?',['Encapsulation','Polymorphism','Compilation','Serialization'],1,'Polymorphism allows the same contract to have multiple implementations.'),
  makeQuestion('java-oops',3,'Which block is always executed after try/catch when present?',['throw','throws','finally','final'],2,'finally is intended for cleanup and normally executes after try/catch.'),
  makeQuestion('java-oops',4,'Which collection stores unique elements?',['ArrayList','HashSet','LinkedList','Vector'],1,'HashSet does not allow duplicate elements.'),
  makeQuestion('dbms-core',1,'Which normal form removes partial dependency?',['1NF','2NF','3NF','BCNF'],1,'2NF removes partial dependencies from a relation in 1NF.'),
  makeQuestion('dbms-core',2,'Which SQL command retrieves rows?',['SELECT','UPDATE','ALTER','DROP'],0,'SELECT is used to query data.'),
  makeQuestion('python-basic',1,'Which symbol starts a comment in Python?',['//','#','/*','--'],1,'Python single-line comments start with #.'),
  makeQuestion('python-basic',2,'Which data type is immutable?',['list','dict','set','tuple'],3,'Tuples are immutable.'),
  makeQuestion('web-tech',1,'Which object represents an HTML document as nodes?',['HTTP','DOM','DNS','FTP'],1,'DOM represents the document tree.'),
  makeQuestion('web-tech',2,'Which CSS selector targets an id?',['.name','#name','name','*name'],1,'# is the id selector.'),
  makeQuestion('aiml-unit1',1,'Which search uses a heuristic function?',['BFS','DFS','Greedy Best-First','DLS'],2,'Greedy Best-First is informed and uses h(n).'),
  makeQuestion('aiml-unit1',2,'What does PEAS stand for?',['Performance, Environment, Actuators, Sensors','Plan, Execute, Act, Search','Process, Evaluate, Analyze, Solve','Percept, Environment, Agent, State'],0,'PEAS describes the task environment of an intelligent agent.'),
  makeQuestion('c-language',1,'Which format specifier prints an int?',['%c','%d','%f','%s'],1,'%d prints a signed decimal integer.'),
  makeQuestion('c-language',2,'Which loop executes its body at least once?',['for','while','do-while','none'],2,'do-while checks the condition after the body.'),
  makeQuestion('data-structure',1,'Which structure follows FIFO?',['Stack','Queue','Tree','Graph'],1,'Queue follows First-In First-Out.'),
  makeQuestion('daa',1,'Binary search time complexity is:',['O(n)','O(log n)','O(n log n)','O(1)'],1,'Each comparison halves the search space.'),
];

export const roadmaps = [
  { id:'java-backend', title:'Java Backend Developer', level:'Beginner → Advanced', duration:'16 weeks', steps:['Java Fundamentals','OOP & Collections','JDBC & SQL','Spring Core','Spring Boot REST APIs','JPA/Hibernate','Security & JWT','Testing & Deployment'] },
  { id:'frontend', title:'Frontend Developer', level:'Beginner → Job-ready', duration:'12 weeks', steps:['HTML','CSS','JavaScript','DOM','Git/GitHub','React','Routing & State','API Integration','Deployment'] },
  { id:'aiml', title:'AI & ML Learner', level:'Academic → Practical', duration:'18 weeks', steps:['Python','Math for AI','Search Algorithms','Knowledge Representation','Data Preprocessing','Supervised ML','Unsupervised ML','Projects'] },
  { id:'firebase', title:'React + Firebase App Builder', level:'Intermediate', duration:'8 weeks', steps:['React Basics','Firebase Auth','Firestore','Storage','Security Rules','Admin Panels','Hosting','Performance'] },
];

export const vacancies = [
  { id:'frontend-intern', title:'Frontend Intern', company:'TechNova Labs', location:'Remote / India', type:'Internship', skills:['HTML','CSS','JavaScript','React'], stipend:'₹8,000–₹12,000', deadline:'2026-10-05', description:'Work on responsive React interfaces and reusable components.' },
  { id:'java-trainee', title:'Java Developer Trainee', company:'CodeSpring Systems', location:'Noida, UP', type:'Full-time', skills:['Java','OOP','SQL','Spring Boot'], stipend:'₹3.2–₹4.2 LPA', deadline:'2026-10-15', description:'Entry-level backend role with Java and Spring Boot.' },
  { id:'python-intern', title:'Python / AI Intern', company:'AIMind Works', location:'Hybrid', type:'Internship', skills:['Python','Pandas','ML Basics'], stipend:'₹10,000', deadline:'2026-09-30', description:'Assist with data preparation, notebooks and ML experiments.' },
  { id:'web-faculty', title:'Web Technology Trainer', company:'SkillBridge Academy', location:'Varanasi, UP', type:'Part-time', skills:['HTML','CSS','JS','Teaching'], stipend:'As per interview', deadline:'2026-10-20', description:'Deliver practical web-technology sessions and mentoring.' },
];

export const posts = [
  { id:'p1', author:'Techtroopers Admin', role:'Admin', title:'Welcome to TroopersTalk', body:'Share coding doubts, project ideas, exam strategies and learning resources with the community.', tags:['Community','Welcome'], likes:42, comments:8, createdAt:'2026-09-15' },
  { id:'p2', author:'Student Trooper', role:'Learner', title:'A* heuristic doubt', body:'When two nodes have the same f(n), what tie-breaking rule should we use in class problems?', tags:['AI','A*'], likes:19, comments:6, createdAt:'2026-09-14' },
  { id:'p3', author:'Project Team', role:'Builder', title:'Mini Project Progress', body:'Our attendance analytics dashboard now supports semester and section filters.', tags:['Project','React','Firebase'], likes:27, comments:4, createdAt:'2026-09-13' },
];

export const projects = [
  { id:'exam-system', title:'Online Examination System', category:'EdTech', description:'Timed exams, navigation, anti-cheating controls, score saving, answer keys and reports.', tech:['React','Firebase'], likes:128, status:'Published' },
  { id:'erp', title:'College ERP Suite', category:'ERP', description:'Role-based administration for academics, HR, accounts, library and student services.', tech:['React','Firebase','Node'], likes:96, status:'Ongoing' },
  { id:'communication', title:'Communication Panel', category:'Communication', description:'WhatsApp-like groups, one-to-one messaging, files, voice and notification workflows.', tech:['React','Firebase'], likes:71, status:'Ongoing' },
  { id:'portfolio', title:'Student Portfolio Hub', category:'Career', description:'Project showcase, comments, likes and contribution opportunities.', tech:['React','Firestore'], likes:54, status:'Published' },
];

export const users = [
  { id:'u1', name:'Demo Student', email:'student@techtroopers.in', rollNumber:'BCA001', role:'student', status:'active' },
  { id:'u2', name:'Ananya Singh', email:'ananya@example.com', rollNumber:'BCA002', role:'student', status:'active' },
  { id:'u3', name:'Rahul Verma', email:'rahul@example.com', rollNumber:'BCA003', role:'student', status:'active' },
  { id:'a1', name:'Techtroopers Admin', email:'admin@techtroopers.in', rollNumber:'ADMIN', role:'admin', status:'active' },
];

export const results = [
  { id:'r1', userId:'u1', name:'Demo Student', rollNumber:'BCA001', examId:'java-oops', exam:'Object Oriented Programming with Java', score:16, total:20, percentage:80, attempted:20, date:'2026-09-12' },
  { id:'r2', userId:'u2', name:'Ananya Singh', rollNumber:'BCA002', examId:'java-oops', exam:'Object Oriented Programming with Java', score:18, total:20, percentage:90, attempted:20, date:'2026-09-12' },
  { id:'r3', userId:'u3', name:'Rahul Verma', rollNumber:'BCA003', examId:'aiml-unit1', exam:'Artificial Intelligence and ML Basics', score:14, total:20, percentage:70, attempted:19, date:'2026-09-13' },
  { id:'r4', userId:'u1', name:'Demo Student', rollNumber:'BCA001', examId:'web-tech', exam:'HTML, CSS, JavaScript and Web Basics', score:17, total:20, percentage:85, attempted:20, date:'2026-09-14' },
];

export const services = [
  { icon:'🧭', title:'Learning Road Maps', text:'Structured paths for Java, React, AI/ML and Firebase learning.' },
  { icon:'📝', title:'Online Assessments', text:'Timed exams with question navigation, auto-submit and instant results.' },
  { icon:'📚', title:'E-books & Notes', text:'Organized study material, code books, notes and revision resources.' },
  { icon:'💼', title:'Opportunities', text:'Internships, jobs and skill-building opportunities for learners.' },
];
