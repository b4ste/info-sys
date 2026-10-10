export function getTestDatabaseUri() {
  return process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017/'
}
