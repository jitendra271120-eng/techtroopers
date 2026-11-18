# Fixes Applied

1. E-Books changed from `ebooks` to the real `BookFile` + `BookCategory` collections.
2. Public e-books use `fileUrl`, `categoryName`, `subCat`, `price`, and `title` from existing documents.
3. Admin E-Books reads/writes the same old Firestore structure and can upload files to Firebase Storage.
4. Exam question matching changed from categories document ID to actual category/name such as `JAVA-UT1`.
5. `totalMarks: 0` now falls back to `numQuestions × marksPerQuestion`.
6. New scores save `category` as the readable exam category and also save the Firestore `examId`.
7. Existing scores without `userId` remain visible through email-based compatibility.
8. Result filters now use category names instead of auto document IDs.
9. Question Bank and Answer Key managers use category names such as `JAVA-UT1`.
10. Vacancies changed from `vacancies` to `jobPosts`.
11. Vacancy admin now includes `jobApplicants` and `jobApplications` tabs.
12. TroopersTalk changed from `troopersPosts` to the existing `posts` collection.
13. Admin Master counts now use `BookFile`, `jobPosts`, and `posts`.
14. Added Admin → Firebase Data inspector for all legacy/current collections.
15. Firestore rules updated for public `BookFile`, `BookCategory`, `jobPosts`, `posts`, categories/questions, old score compatibility, and job applications.
16. Font sizes increased across the whole portal and admin interface.
