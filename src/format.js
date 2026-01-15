export function examLabel(examId, district) {
  return `${district}-${String(examId).padStart(6, "0")}`;
}
