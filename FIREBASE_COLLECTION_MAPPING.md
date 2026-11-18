# TechTroopers — Firestore collection mapping used by this build

This build reads the collection names and fields visible in the supplied Firebase screenshots. No database migration is required for the modules below.

## E-books

- `BookCategory`
  - `category`
  - `description`
- `BookFile`
  - `categoryId`
  - `categoryName`
  - `fileUrl`
  - `price`
  - `subCat`
  - `title`

Public page: `/ebooks`  
Admin page: `/admin/ebooks`

## Online examinations

- `categories`
  - `name` (example: `JAVA-UT1`)
  - `marksPerQuestion`
  - `numQuestions`
  - `secretCodes[]`
  - `timer`
  - `totalMarks`
  - optional `showAnswerKey`
- `questions`
  - `category` (example: `JAVA-UT1`)
  - `question`
  - `options[]`
  - `answer` (0-3)
  - `getQuesDesc`
- `scores`
  - supports old fields: `category`, `email`, `name`, `rollNumber`, `score`, `secretCode`, `timestamp`, `total`
  - new writes also add `userId`, `examId`, `correct`, `attempted`, `percentage`, `warnings`
- `userAnswers`
  - answers, questionIds and score reference

Important: the category Firestore document ID is not used as the question category. The code matches `categories.name/category` to `questions.category`.

## Jobs

- `jobPosts`
- `jobApplicants`
- `jobApplications`
- legacy `jobapplicantsDetails` is visible in the data inspector

Public page: `/vacancies`  
Admin page: `/admin/vacancies`

## Community

- `posts`
  - `authorEmail`, `authorName`, `authorPhoto`, `authorUid`
  - `content`, `createdAt`
  - `commentsCount`, `likesCount`, `likedBy`
  - comments subcollection is supported by security rules

Public page: `/talk`  
Admin page: `/admin/troopers-talk`

## Other existing collections exposed in Admin > Firebase Data

`C`, `C++`, `Java`, `JavaScript`, `Python`, `Languages`, `Categories`, `QuestionBankCategory`, `QuestionBankSubCategory`, `UserProgress`, `careerCat`, `course`, `users`, `admins`, `roadmaps`, `portfolioPosts`, `tech_snake_rooms`, `tech_snake_scores`, `internshipEnroll`.

These are intentionally preserved rather than renamed.
