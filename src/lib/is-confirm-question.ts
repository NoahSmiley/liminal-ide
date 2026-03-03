const CONFIRM_PATTERN = /\b(are you sure|do you want me to|would you like me to|should i (proceed|continue|go ahead)|shall i|want me to|y\/n|yes or no|confirm)\b/i;

export function isConfirmQuestion(content: string): boolean {
  return content.includes("?") && CONFIRM_PATTERN.test(content);
}
