# Migration Notes — No Collection Rename Required

This build was changed specifically to work with the existing Firestore collection names supplied in the Firebase screenshots. You do **not** need to migrate `BookFile` to `ebooks`, `jobPosts` to `vacancies`, or `posts` to `troopersPosts`.

Key compatibility behavior:

1. Public/Admin E-books use `BookCategory` and `BookFile` directly.
2. Exam questions are matched with `categories.name/category` -> `questions.category`; the random Firestore document ID is not used as the question category.
3. Old score documents that have `email` but no `userId` remain readable by the reports/dashboard when rules are deployed.
4. New result records save both readable `category` and Firestore `examId`.
5. Vacancies use `jobPosts`; new applications write compatible records to `jobApplications` and `jobApplicants`.
6. TroopersTalk uses `posts` with the existing author/likes/comment count field names.
7. Other legacy collections remain visible from Admin > Firebase Data.

## Required deployment step

Deploy the included security rules after updating the project:

```bash
firebase deploy --only firestore:rules,storage
```

## Admin document

For reliable Firestore writes, create `admins/{FirebaseAuthUID}` for the admin account. The UI can recognize older random-ID admin documents by email, but Firestore security rules cannot query an arbitrary admin document by its email field.
