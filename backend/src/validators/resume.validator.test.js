/**
 * Resume Validator Tests
 * Run with: node src/validators/resume.validator.test.js
 */

const { ResumeValidator, InvalidDocumentError, VALIDATION_CONFIG } = require('./resume.validator');

// ============================================
// TEST UTILITIES
// ============================================

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message} Expected: ${expected}, Got: ${actual}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(message || 'Expected true, got false');
  }
}

function assertThrows(fn, errorType, message = '') {
  try {
    fn();
    throw new Error(`${message} Expected to throw ${errorType.name}, but did not throw`);
  } catch (error) {
    if (!(error instanceof errorType)) {
      throw new Error(`${message} Expected ${errorType.name}, got ${error.constructor.name}: ${error.message}`);
    }
  }
}

// ============================================
// TEST DATA
// ============================================

// Valid resume text (English)
const VALID_RESUME_EN = `
John Doe
Senior Software Engineer

Education:
- BS Computer Science, MIT, 2015

Experience:
Google Inc. (2018-Present)
Senior Software Engineer
- Led development of cloud infrastructure
- Managed team of 5 engineers

Skills:
- JavaScript, Python, Go
- AWS, GCP, Kubernetes
- System Design

Professional Summary:
Experienced software engineer with 8 years of experience in cloud computing and distributed systems.
`;

// Valid resume text (Chinese)
const VALID_RESUME_CN = `
张三
高级软件工程师

教育背景:
- 北京大学 计算机科学 硕士 2018

工作经历:
阿里巴巴集团 (2018-至今)
高级软件工程师
- 负责核心交易系统开发
- 带领5人团队完成项目

技能:
- Java, Python, Go
- 微服务架构
- 分布式系统

项目经验:
双十一交易系统优化项目
`;

// Invalid: Too short (likely empty or OCR failure)
const INVALID_TOO_SHORT = 'Hello world';

// Invalid: Cooking recipe (no resume keywords)
const INVALID_RECIPE = `
How to Make Chocolate Cake

Ingredients:
- 2 cups flour
- 1 cup sugar
- 1/2 cup cocoa powder
- 2 eggs
- 1 cup milk
- 1/2 cup butter

Instructions:
1. Preheat oven to 350°F
2. Mix dry ingredients
3. Add wet ingredients
4. Pour into pan
5. Bake for 30 minutes
6. Let cool and enjoy!

Tips for best results:
- Use room temperature eggs
- Don't overmix the batter
- Test with a toothpick

This recipe has been in my family for generations.
Perfect for birthdays and special occasions.
`;

// Invalid: Random string (no resume keywords)
const INVALID_RANDOM = `
Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.
Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.
`.repeat(5);

// Edge case: Long document (> 100k chars)
const INVALID_TOO_LONG = 'a'.repeat(150000);

// ============================================
// TESTS
// ============================================

console.log('\n🧪 Running Resume Validator Tests\n');
console.log('='.repeat(50));

// Test 1: Valid English resume passes
test('Valid English resume passes validation', () => {
  const validator = new ResumeValidator();
  const result = validator.validate(VALID_RESUME_EN);
  assertTrue(result.isValid, 'Should be valid');
  assertTrue(result.keywordsFound.length >= 2, 'Should find at least 2 keywords');
});

// Test 2: Valid Chinese resume passes
test('Valid Chinese resume passes validation', () => {
  const validator = new ResumeValidator();
  const result = validator.validate(VALID_RESUME_CN);
  assertTrue(result.isValid, 'Should be valid');
  assertTrue(result.keywordsFound.length >= 2, 'Should find at least 2 keywords');
});

// Test 3: Too short text throws error
test('Too short text throws InvalidDocumentError', () => {
  const validator = new ResumeValidator();
  assertThrows(
    () => validator.validate(INVALID_TOO_SHORT),
    InvalidDocumentError,
    'Should throw for short text'
  );
});

// Test 4: Cooking recipe fails keyword check
test('Cooking recipe fails keyword validation', () => {
  const validator = new ResumeValidator();
  assertThrows(
    () => validator.validate(INVALID_RECIPE),
    InvalidDocumentError,
    'Should throw for non-resume content'
  );
});

// Test 5: Random text fails keyword check
test('Random text fails keyword validation', () => {
  const validator = new ResumeValidator();
  assertThrows(
    () => validator.validate(INVALID_RANDOM),
    InvalidDocumentError,
    'Should throw for random text'
  );
});

// Test 6: Too long text throws error
test('Too long text throws InvalidDocumentError', () => {
  const validator = new ResumeValidator();
  assertThrows(
    () => validator.validate(INVALID_TOO_LONG),
    InvalidDocumentError,
    'Should throw for extremely long text'
  );
});

// Test 7: Empty string throws error
test('Empty string throws InvalidDocumentError', () => {
  const validator = new ResumeValidator();
  assertThrows(
    () => validator.validate(''),
    InvalidDocumentError,
    'Should throw for empty string'
  );
});

// Test 8: Null input throws error
test('Null input throws InvalidDocumentError', () => {
  const validator = new ResumeValidator();
  assertThrows(
    () => validator.validate(null),
    InvalidDocumentError,
    'Should throw for null input'
  );
});

// Test 9: isValid() returns boolean without throwing
test('isValid() returns boolean without throwing', () => {
  const validator = new ResumeValidator();
  
  const validResult = validator.isValid(VALID_RESUME_EN);
  assertTrue(validResult === true, 'Should return true for valid resume');
  
  const invalidResult = validator.isValid(INVALID_RECIPE);
  assertTrue(invalidResult === false, 'Should return false for invalid content');
});

// Test 10: validateSafe() returns object without throwing
test('validateSafe() returns object without throwing', () => {
  const validator = new ResumeValidator();
  
  const validResult = validator.validateSafe(VALID_RESUME_EN);
  assertTrue(validResult.isValid === true, 'Should have isValid: true');
  
  const invalidResult = validator.validateSafe(INVALID_RECIPE);
  assertTrue(invalidResult.isValid === false, 'Should have isValid: false');
  assertTrue(typeof invalidResult.error === 'string', 'Should have error message');
});

// Test 11: Custom config overrides defaults
test('Custom config overrides defaults', () => {
  const customValidator = new ResumeValidator({
    MIN_KEYWORD_MATCHES: 1  // Lower threshold
  });
  
  // Text with only 1 keyword
  const oneKeywordText = 'This is my resume. ' + 'a'.repeat(100);
  const result = customValidator.validateSafe(oneKeywordText);
  assertTrue(result.isValid === true, 'Should pass with custom config');
});

// Test 12: Error details are captured correctly
test('Error details are captured correctly', () => {
  const validator = new ResumeValidator();
  
  try {
    validator.validate(INVALID_TOO_SHORT);
  } catch (error) {
    assertTrue(error instanceof InvalidDocumentError, 'Should be InvalidDocumentError');
    assertTrue(error.details.check === 'length', 'Should have check type');
    assertTrue(typeof error.details.textLength === 'number', 'Should have text length');
    assertTrue(error.statusCode === 422, 'Should have status code 422');
  }
});

// ============================================
// SUMMARY
// ============================================

console.log('='.repeat(50));
console.log(`\n📊 Test Results: ${testsPassed} passed, ${testsFailed} failed\n`);

if (testsFailed > 0) {
  process.exit(1);
}

console.log('✅ All tests passed!\n');

