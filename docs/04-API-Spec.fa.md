<div dir="rtl">

# ۰۴. مشخصات API

**English:** [04. API Specification](04-API-Spec.md)

---

## ۱. نمای کلی
- **Base URL:** `/api/v1` (در `main.ts` پیکربندی شده)
- **مستندات:** Swagger UI در `/docs` (در `main.ts` خط ۴۸).
- **فرمت‌ها:** بدنه و پاسخ JSON.

## ۲. احراز هویت (`/auth`)
| متد | مسیر | احراز | درخواست | پاسخ |
|:----|:-----|:------|:--------|:-----|
| POST | `/register` | عمومی | `{email, password}` | `{accessToken, refreshToken}` |
| POST | `/login` | عمومی | `{email, password}` | `{accessToken, refreshToken}` |
| POST | `/refresh` | عمومی | `{refreshToken}` | `{accessToken, refreshToken}` |
| POST | `/logout` | عمومی | `{refreshToken}` | `{success: true}` |

## ۳. کاربران (`/users`)
| متد | مسیر | احراز | پارامترهای کلیدی | توضیح |
|:----|:-----|:------|:-----------------|:------|
| GET | `/profile` | JWT | — | جزئیات پروفایل فعلی. |
| PUT | `/profile` | JWT | — | به‌روزرسانی `displayName`, `bio`, `avatarUrl`. |
| GET | `/stats` | JWT | — | تعداد لیست‌ها/امتیازها. |
| PUT | `/preferences` | JWT | — | به‌روزرسانی ترجیحات JSON. |
| GET | `/export` | JWT | — | خروجی کامل JSON دادهٔ کاربر. |
| DELETE | `/account` | JWT | — | حذف نرم کاربر. |

## ۴. فیلم‌ها (`/movies`)
| متد | مسیر | احراز | پارامترها | توضیح |
|:----|:-----|:------|:----------|:------|
| GET | `/search` | — | `q`, `year`, `page`, `with_genres` | جستجوی فیلم (کش). |
| GET | `/:id` | اختیاری | `lang` | جزئیات فیلم (کپی DB). |
| GET | `/trending` | — | `page`, `lang` | ترند هفتگی. |
| GET | `/popular` | — | `page`, `lang` | فیلم‌های پرطرفدار. |
| POST | `/:id/rating` | JWT | — | بدنه: `{rating: 1-10}`. |
| POST | `/:id/bookmark` | JWT | — | پشتیبانی بوکمارک (legacy). |

## ۵. لیست‌ها (`/lists`)
| متد | مسیر | احراز | درخواست/کوئری | توضیح |
|:----|:-----|:------|:---------------|:------|
| GET | `/:listName` | JWT | `page`, `limit`, `sort` | دریافت آیتم‌ها (مثلاً واچ‌لیست). |
| POST | `/:listName` | JWT | بدنه: `{tmdbId, title, posterPath}` | افزودن آیتم به لیست. |
| DELETE | `/:listName/:id` | JWT | — | حذف فیلم (tmdbId) از لیست. |

## ۶. پیشنهادها (`/recommendations`)
| متد | مسیر | احراز | بدنه | توضیح |
|:----|:-----|:------|:-----|:------|
| POST | `/` | JWT | `{query: "string", language?: "en", contentFilter?: {}}` | دریافت پیشنهاد هوشمند غنی‌شده. |

## ۷. صفحه‌بندی و فیلتر
- **صفحه‌بندی:** پارامترهای استاندارد `page` (از ۱) و `limit` در کنترلرها.
  - شواهد: `src/lists/lists.controller.ts` (خطوط ۴۰–۴۱).
- **مرتب‌سازی:** در API لیست‌ها با `sort=addedAt:asc|desc`.

</div>
