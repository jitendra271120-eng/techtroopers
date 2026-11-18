# TechTroopers Firestore Schema — Current Compatibility Build

The application is mapped to the existing production-style collection names visible in the supplied Firebase console screenshots.

See `FIREBASE_COLLECTION_MAPPING.md` for the detailed collection-to-page map.

## E-books

### BookCategory
- category
- description

### BookFile
- title
- categoryId
- categoryName
- subCat
- price
- fileUrl

## Exams

### categories
- name / category / title (the current records can use `name`, e.g. `JAVA-UT1`)
- timer
- marksPerQuestion
- totalMarks
- numQuestions
- secretCodes[]
- showAnswerKey (optional)

### questions
- category — readable category string such as `JAVA-UT1`
- question
- options[]
- answer — numeric index 0..3
- getQuesDesc

### scores
Old records are supported with:
- category
- email
- name
- rollNumber
- score
- secretCode
- timestamp
- total

New writes additionally store userId, examId, correct, attempted, percentage and warnings.

### userAnswers
- userId / email / rollNumber
- category
- examId
- secretCode
- answers[]
- questionIds[]
- score / total
- scoreRefId

## Job portal
- jobPosts
- jobApplicants
- jobApplications
- jobapplicantsDetails (legacy data remains inspectable)

## Community
### posts
- authorEmail
- authorName
- authorPhoto
- authorUid
- content
- commentsCount
- likesCount
- likedBy[]
- createdAt
- comments/{commentId} subcollection

## Admin
Recommended document:

admins/{FirebaseAuthUID}
- email
- role: admin
- active: true

## Other preserved collections
C, C++, Java, JavaScript, Python, Languages, Categories, QuestionBankCategory, QuestionBankSubCategory, UserProgress, careerCat, course, users, roadmaps, portfolioPosts, tech_snake_rooms, tech_snake_scores, internshipEnroll.
