/**
 * Express 4 خطاهای async را به‌صورت خودکار نمی‌گیرد؛
 * این wrapper تضمین می‌کند هر throw/reject داخل کنترلر به میان‌افزار خطا برسد.
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
