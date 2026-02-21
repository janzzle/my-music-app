/**
 * 사용자 입력 문자열을 검증하고, XSS 공격 및 화면 깨짐을 유발할 수 있는 특수문자를 안전하게 치환합니다.
 * @param {string} input - 사용자가 입력한 원본 텍스트
 * @param {number} maxLength - 허용되는 최대 글자 수 (기본값 500자)
 * @returns {string} - 검증된 안전한 텍스트
 */
export const sanitizeInput = (input, maxLength = 500) => {
  if (typeof input !== 'string') return ''; // 문자열이 아닐 경우 빈 문자열 반환
  if (!input.trim()) return ''; // 공백만 있으면 빈칸 반환

  // 1. 글자 수 자르기 (maxLength 초과 시 강제로 자름)
  let result = input.trim();
  if (result.length > maxLength) {
    result = result.substring(0, maxLength);
  }

  // 2. HTML 엔티티 치환 (XSS 괄호 무력화 등)
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    "/": '&#x2F;',
  };

  const reg = /[&<>"'/]/ig;
  result = result.replace(reg, (match) => map[match]);

  return result;
};
