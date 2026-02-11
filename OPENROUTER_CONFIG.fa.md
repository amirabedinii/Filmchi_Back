<div dir="rtl">

# پیکربندی OpenRouter

**English:** [OPENROUTER_CONFIG.md](OPENROUTER_CONFIG.md)

---

برای استفاده از OpenRouter به‌عنوان ارائه‌دهندهٔ LLM، متغیرهای محیط زیر را به `.env` اضافه کنید.

## متغیرهای اجباری
```bash
OPENROUTER_API_KEY=your-openrouter-api-key-here
OPENROUTER_MODEL=openai/gpt-4o
```

## متغیرهای اختیاری
```bash
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_SITE_URL=http://localhost:3001
OPENROUTER_SITE_NAME=Filmchi
```

## مدل‌های پشتیبانی‌شده
- `openai/gpt-4o`, `openai/gpt-4o-mini`, `openai/gpt-4-turbo`, `openai/gpt-3.5-turbo`
- `anthropic/claude-3.5-sonnet`, `anthropic/claude-3-haiku`, `anthropic/claude-3-opus`
- `google/gemini-pro`
- `meta-llama/llama-3.1-8b-instruct`, `meta-llama/llama-3.1-70b-instruct`
- `mistralai/mistral-7b-instruct`, `mistralai/mixtral-8x7b-instruct`

## استفاده
پس از پیکربندی، از طریق سرویس LLM موجود می‌توان از OpenRouter استفاده کرد؛ در صورت در دسترس بودن به‌صورت خودکار استفاده می‌شود.

## دریافت API Key
۱. به [OpenRouter.ai](https://openrouter.ai/) بروید.  
۲. ثبت‌نام کنید.  
۳. از داشبورد کلید API بسازید.  
۴. کلید را در متغیرهای محیط قرار دهید.

</div>
