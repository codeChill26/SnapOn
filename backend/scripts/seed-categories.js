'use strict';

require('dotenv').config();
const pool = require('../config/db');

const CATEGORIES_TO_SEED = [
  {
    name: 'Nội dung & Viết lách',
    slug: 'content',
    subcategories: [
      { name: 'Viết caption mạng xã hội', slug: 'social-caption' },
      { name: 'Viết bài blog', slug: 'blog-post' },
      { name: 'Viết bài chuẩn SEO', slug: 'seo-post' },
      { name: 'Viết nội dung website', slug: 'website-content' },
      { name: 'Viết mô tả sản phẩm', slug: 'product-desc' },
      { name: 'Viết nội dung quảng cáo', slug: 'ads-copy' },
      { name: 'Viết kịch bản TikTok', slug: 'tiktok-script' },
      { name: 'Viết kịch bản YouTube', slug: 'youtube-script' },
      { name: 'Viết email marketing', slug: 'email-copy' },
      { name: 'Viết CV và thư xin việc', slug: 'cv-coverletter' },
      { name: 'Biên tập nội dung', slug: 'content-editing' },
      { name: 'Kiểm tra chính tả', slug: 'spell-check' },
      { name: 'Viết lại nội dung', slug: 'rewrite' },
      { name: 'Tóm tắt tài liệu', slug: 'doc-summary' }
    ]
  },
  {
    name: 'Thiết kế',
    slug: 'design',
    subcategories: [
      { name: 'Thiết kế logo', slug: 'logo-design' },
      { name: 'Thiết kế banner', slug: 'banner-design' },
      { name: 'Thiết kế poster', slug: 'poster-design' },
      { name: 'Thiết kế bài đăng mạng xã hội', slug: 'social-post-design' },
      { name: 'Thiết kế thumbnail', slug: 'thumbnail-design' },
      { name: 'Thiết kế menu', slug: 'menu-design' },
      { name: 'Thiết kế danh thiếp', slug: 'business-card-design' },
      { name: 'Thiết kế brochure', slug: 'brochure-design' },
      { name: 'Thiết kế slide PowerPoint', slug: 'powerpoint-design' },
      { name: 'Thiết kế CV', slug: 'cv-design' },
      { name: 'Thiết kế infographic', slug: 'infographic-design' },
      { name: 'Thiết kế giao diện mobile', slug: 'mobile-ui-design' },
      { name: 'Thiết kế giao diện website', slug: 'web-ui-design' },
      { name: 'Chỉnh sửa template Canva', slug: 'canva-edit' },
      { name: 'Vẽ icon và minh họa', slug: 'illustration-design' }
    ]
  },
  {
    name: 'Video, Hình ảnh & Âm thanh',
    slug: 'video-media',
    subcategories: [
      { name: 'Chỉnh sửa video TikTok', slug: 'tiktok-edit' },
      { name: 'Chỉnh sửa video Reels', slug: 'reels-edit' },
      { name: 'Chỉnh sửa YouTube Shorts', slug: 'shorts-edit' },
      { name: 'Chỉnh sửa video YouTube', slug: 'youtube-edit' },
      { name: 'Cắt ghép video', slug: 'video-cutting' },
      { name: 'Thêm phụ đề video', slug: 'video-subtitle' },
      { name: 'Chỉnh màu video', slug: 'color-grading' },
      { name: 'Tách video dài thành video ngắn', slug: 'video-slicing' },
      { name: 'Làm intro và outro', slug: 'intro-outro' },
      { name: 'Tách nền ảnh', slug: 'bg-remove' },
      { name: 'Chỉnh sửa ảnh sản phẩm', slug: 'product-photo-edit' },
      { name: 'Retouch ảnh', slug: 'photo-retouch' },
      { name: 'Xóa vật thể trong ảnh', slug: 'object-remove' },
      { name: 'Thu âm giọng đọc', slug: 'voiceover' },
      { name: 'Lọc tạp âm', slug: 'noise-filter' },
      { name: 'Chỉnh sửa podcast', slug: 'podcast-edit' },
      { name: 'Chuyển audio thành văn bản', slug: 'audio-to-text' }
    ]
  },
  {
    name: 'Marketing',
    slug: 'marketing',
    subcategories: [
      { name: 'Quản lý fanpage', slug: 'fanpage-management' },
      { name: 'Quản lý kênh TikTok', slug: 'tiktok-management' },
      { name: 'Lên lịch đăng bài', slug: 'post-scheduling' },
      { name: 'Lập kế hoạch nội dung', slug: 'content-planning' },
      { name: 'Tìm ý tưởng nội dung', slug: 'content-ideation' },
      { name: 'Nghiên cứu từ khóa SEO', slug: 'seo-keyword-research' },
      { name: 'Tối ưu bài viết SEO', slug: 'seo-optimization' },
      { name: 'Phân tích đối thủ', slug: 'competitor-analysis' },
      { name: 'Nghiên cứu hashtag', slug: 'hashtag-research' },
      { name: 'Tìm kiếm KOC', slug: 'koc-outreach' },
      { name: 'Tìm kiếm influencer', slug: 'influencer-outreach' },
      { name: 'Quản lý cộng đồng online', slug: 'community-management' },
      { name: 'Theo dõi số liệu chiến dịch', slug: 'metrics-tracking' },
      { name: 'Lập báo cáo marketing', slug: 'marketing-reporting' },
      { name: 'Hỗ trợ email marketing', slug: 'email-marketing-support' },
      { name: 'Audit fanpage cơ bản', slug: 'fanpage-audit' }
    ]
  },
  {
    name: 'Công nghệ',
    slug: 'tech',
    subcategories: [
      { name: 'Thiết kế landing page', slug: 'landing-page-dev' },
      { name: 'Phát triển website', slug: 'website-dev' },
      { name: 'Chỉnh sửa giao diện website', slug: 'web-frontend-edit' },
      { name: 'Sửa lỗi HTML/CSS', slug: 'html-css-debug' },
      { name: 'Sửa lỗi React', slug: 'react-debug' },
      { name: 'Sửa lỗi React Native', slug: 'react-native-debug' },
      { name: 'Sửa lỗi Flutter', slug: 'flutter-debug' },
      { name: 'Sửa lỗi Java Spring Boot', slug: 'spring-boot-debug' },
      { name: 'Sửa lỗi Node.js', slug: 'nodejs-debug' },
      { name: 'Kết nối API', slug: 'api-integration' },
      { name: 'Tạo tính năng mobile', slug: 'mobile-feature-dev' },
      { name: 'Tạo tính năng website', slug: 'web-feature-dev' },
      { name: 'Cài đặt WordPress', slug: 'wordpress-install' },
      { name: 'Chỉnh sửa WordPress', slug: 'wordpress-edit' },
      { name: 'Viết truy vấn SQL', slug: 'sql-queries' },
      { name: 'Sửa lỗi database', slug: 'db-debug' },
      { name: 'Kiểm thử website', slug: 'web-testing' },
      { name: 'Kiểm thử ứng dụng', slug: 'app-testing' },
      { name: 'Viết test case', slug: 'test-case-writing' },
      { name: 'Deploy website', slug: 'web-deployment' },
      { name: 'Cấu hình hosting và domain', slug: 'hosting-domain-config' }
    ]
  },
  {
    name: 'Nhập liệu & Hành chính',
    slug: 'admin',
    subcategories: [
      { name: 'Nhập dữ liệu Excel', slug: 'excel-entry' },
      { name: 'Nhập thông tin sản phẩm', slug: 'product-entry' },
      { name: 'Nhập danh sách khách hàng', slug: 'customer-data-entry' },
      { name: 'Đánh máy tài liệu', slug: 'document-typing' },
      { name: 'Chuyển PDF sang Word', slug: 'pdf-to-word' },
      { name: 'Chuyển PDF sang Excel', slug: 'pdf-to-excel' },
      { name: 'Chuyển hình ảnh thành văn bản', slug: 'image-to-text' },
      { name: 'Làm sạch dữ liệu', slug: 'data-cleaning' },
      { name: 'Xóa dữ liệu trùng lặp', slug: 'duplicate-remove' },
      { name: 'Phân loại dữ liệu', slug: 'data-classification' },
      { name: 'Gộp file Excel', slug: 'excel-merge' },
      { name: 'Tạo bảng tính', slug: 'spreadsheet-creation' },
      { name: 'Tạo Google Forms', slug: 'google-forms-setup' },
      { name: 'Tổng hợp kết quả khảo sát', slug: 'survey-aggregation' },
      { name: 'Sắp xếp tài liệu', slug: 'file-organization' },
      { name: 'Đổi tên file hàng loạt', slug: 'batch-file-rename' },
      { name: 'Sắp xếp Google Drive', slug: 'google-drive-organization' },
      { name: 'Quản lý lịch hẹn', slug: 'calendar-management' },
      { name: 'Chuẩn bị biên bản cuộc họp', slug: 'meeting-minutes' },
      { name: 'Trợ lý ảo online', slug: 'virtual-assistant' }
    ]
  },
  {
    name: 'Nghiên cứu',
    slug: 'research',
    subcategories: [
      { name: 'Nghiên cứu thị trường', slug: 'market-research' },
      { name: 'Nghiên cứu đối thủ', slug: 'competitor-research' },
      { name: 'Nghiên cứu khách hàng', slug: 'customer-research' },
      { name: 'Nghiên cứu sản phẩm', slug: 'product-research' },
      { name: 'Nghiên cứu giá bán', slug: 'pricing-research' },
      { name: 'Tìm nhà cung cấp', slug: 'supplier-sourcing' },
      { name: 'Tìm xưởng sản xuất', slug: 'factory-sourcing' },
      { name: 'Tìm thông tin doanh nghiệp', slug: 'business-info-search' },
      { name: 'Tìm danh sách khách hàng tiềm năng', slug: 'lead-generation-sourcing' },
      { name: 'Tìm nguồn tài liệu', slug: 'literature-search' },
      { name: 'Tìm bài nghiên cứu', slug: 'research-papers-search' },
      { name: 'Tóm tắt báo cáo', slug: 'report-summary' },
      { name: 'Tổng hợp dữ liệu Internet', slug: 'web-data-synthesis' },
      { name: 'Nghiên cứu xu hướng TikTok', slug: 'tiktok-trend-research' },
      { name: 'Nghiên cứu xu hướng nội dung', slug: 'content-trend-research' },
      { name: 'Nghiên cứu từ khóa', slug: 'keyword-trend-research' },
      { name: 'Thiết kế khảo sát', slug: 'survey-design' },
      { name: 'Tổng hợp kết quả khảo sát', slug: 'survey-results-synthesis' },
      { name: 'Kiểm chứng thông tin', slug: 'fact-checking' }
    ]
  },
  {
    name: 'Thương mại điện tử',
    slug: 'ecommerce',
    subcategories: [
      { name: 'Đăng sản phẩm lên Shopee', slug: 'shopee-listing' },
      { name: 'Đăng sản phẩm lên TikTok Shop', slug: 'tiktok-shop-listing' },
      { name: 'Đăng sản phẩm lên Lazada', slug: 'lazada-listing' },
      { name: 'Đăng sản phẩm lên website', slug: 'website-listing' },
      { name: 'Viết tiêu đề sản phẩm', slug: 'product-title-writing' },
      { name: 'Viết mô tả sản phẩm', slug: 'product-desc-writing' },
      { name: 'Chỉnh sửa ảnh sản phẩm', slug: 'product-photo-ecommerce' },
      { name: 'Phân loại sản phẩm', slug: 'product-categorization' },
      { name: 'Tạo mã SKU', slug: 'sku-generation' },
      { name: 'Cập nhật giá sản phẩm', slug: 'price-update' },
      { name: 'Cập nhật tồn kho', slug: 'inventory-update' },
      { name: 'Quản lý gian hàng', slug: 'store-management' },
      { name: 'Theo dõi đơn hàng', slug: 'order-tracking' },
      { name: 'Xác nhận đơn hàng', slug: 'order-confirmation' },
      { name: 'Trả lời tin nhắn khách hàng', slug: 'chat-support-ecommerce' },
      { name: 'Tư vấn sản phẩm', slug: 'product-consultation' },
      { name: 'Hỗ trợ chốt đơn', slug: 'sales-closing-support' },
      { name: 'Viết kịch bản livestream', slug: 'livestream-script' },
      { name: 'Trực bình luận livestream', slug: 'livestream-comment-moderation' },
      { name: 'Nghiên cứu sản phẩm bán chạy', slug: 'hot-product-research' }
    ]
  },
  {
    name: 'Dịch thuật & Ngôn ngữ',
    slug: 'translation',
    subcategories: [
      { name: 'Dịch Anh sang Việt', slug: 'en-to-vi-trans' },
      { name: 'Dịch Việt sang Anh', slug: 'vi-to-en-trans' },
      { name: 'Dịch tài liệu', slug: 'doc-translation' },
      { name: 'Dịch bài viết', slug: 'article-translation' },
      { name: 'Dịch nội dung website', slug: 'web-translation' },
      { name: 'Dịch mô tả sản phẩm', slug: 'product-translation' },
      { name: 'Dịch email', slug: 'email-translation' },
      { name: 'Dịch phụ đề video', slug: 'subtitle-translation' },
      { name: 'Dịch tài liệu kỹ thuật', slug: 'technical-translation' },
      { name: 'Kiểm tra bản dịch', slug: 'proofreading-translation' },
      { name: 'Sửa ngữ pháp tiếng Anh', slug: 'grammar-check-en' },
      { name: 'Biên tập văn bản tiếng Anh', slug: 'editing-en' },
      { name: 'Chuyển audio thành văn bản', slug: 'audio-to-text-language' },
      { name: 'Chuyển video thành văn bản', slug: 'video-to-text-language' },
      { name: 'Thu âm tiếng Anh', slug: 'voiceover-en' },
      { name: 'Luyện phát âm', slug: 'pronunciation-training' },
      { name: 'Luyện giao tiếp online', slug: 'speaking-practice-online' }
    ]
  },
  {
    name: 'Hỗ trợ học tập',
    slug: 'study',
    subcategories: [
      { name: 'Gia sư Toán online', slug: 'math-tutor-online' },
      { name: 'Gia sư tiếng Anh online', slug: 'english-tutor-online' },
      { name: 'Gia sư Tin học online', slug: 'cs-tutor-online' },
      { name: 'Gia sư môn phổ thông', slug: 'school-subject-tutor' },
      { name: 'Hướng dẫn lập trình', slug: 'programming-guidance' },
      { name: 'Hướng dẫn làm bài tập', slug: 'homework-guidance' },
      { name: 'Giải thích đề bài', slug: 'problem-explanation' },
      { name: 'Review bài làm', slug: 'homework-review' },
      { name: 'Sửa bài viết', slug: 'essay-revision' },
      { name: 'Tìm tài liệu học tập', slug: 'study-docs-sourcing' },
      { name: 'Hướng dẫn nghiên cứu', slug: 'research-guidance' },
      { name: 'Hướng dẫn trích dẫn tài liệu', slug: 'citation-guidance' },
      { name: 'Định dạng báo cáo', slug: 'report-formatting' },
      { name: 'Thiết kế slide thuyết trình', slug: 'presentation-design-study' },
      { name: 'Luyện thuyết trình', slug: 'presentation-coaching' },
      { name: 'Hướng dẫn Word', slug: 'ms-word-tutorial' },
      { name: 'Hướng dẫn Excel', slug: 'ms-excel-tutorial' },
      { name: 'Hướng dẫn PowerPoint', slug: 'ms-powerpoint-tutorial' },
      { name: 'Hướng dẫn Canva', slug: 'canva-tutorial' },
      { name: 'Review CV', slug: 'cv-review' },
      { name: 'Luyện phỏng vấn', slug: 'interview-practice' }
    ]
  },
  {
    name: 'Chăm sóc khách hàng',
    slug: 'customer-service',
    subcategories: [
      { name: 'Trực tin nhắn fanpage', slug: 'fanpage-chat-support' },
      { name: 'Trả lời bình luận', slug: 'comment-moderation' },
      { name: 'Trả lời live chat', slug: 'live-chat-support' },
      { name: 'Tư vấn khách hàng online', slug: 'customer-consultation' },
      { name: 'Hỗ trợ khách sử dụng sản phẩm', slug: 'product-usage-support' },
      { name: 'Gọi xác nhận đơn hàng', slug: 'order-confirm-call' },
      { name: 'Nhắc khách thanh toán', slug: 'payment-reminder-call' },
      { name: 'Xác nhận lịch hẹn', slug: 'appointment-confirmation-call' },
      { name: 'Nhắc lịch hẹn', slug: 'appointment-reminder-call' },
      { name: 'Tiếp nhận phản hồi', slug: 'feedback-reception' },
      { name: 'Tiếp nhận khiếu nại', slug: 'complaint-reception' },
      { name: 'Tổng hợp vấn đề khách hàng', slug: 'customer-issue-summary' },
      { name: 'Chăm sóc khách hàng sau mua', slug: 'post-purchase-care' },
      { name: 'Gọi khảo sát khách hàng', slug: 'feedback-survey-call' },
      { name: 'Quản lý cộng đồng', slug: 'community-moderation' },
      { name: 'Duyệt bài trong nhóm', slug: 'group-post-approval' },
      { name: 'Kiểm soát bình luận spam', slug: 'spam-comment-moderation' },
      { name: 'Cập nhật thông tin khách hàng', slug: 'customer-info-update' },
      { name: 'Phân loại khách hàng', slug: 'customer-segmentation' },
      { name: 'Theo dõi yêu cầu hỗ trợ', slug: 'ticket-tracking' }
    ]
  },
  {
    name: 'AI & Tự động hóa',
    slug: 'ai-automation',
    subcategories: [
      { name: 'Viết prompt ChatGPT', slug: 'chatgpt-prompting' },
      { name: 'Tối ưu prompt AI', slug: 'prompt-optimization' },
      { name: 'Viết prompt tạo hình ảnh', slug: 'image-prompt-writing' },
      { name: 'Tạo bộ prompt theo nhu cầu', slug: 'custom-prompts-pack' },
      { name: 'Tạo nội dung bằng AI', slug: 'ai-content-generation' },
      { name: 'Biên tập nội dung AI', slug: 'ai-content-editing' },
      { name: 'Tóm tắt tài liệu bằng AI', slug: 'ai-doc-summarization' },
      { name: 'Tạo hình ảnh bằng AI', slug: 'ai-image-generation' },
      { name: 'Chỉnh sửa hình ảnh AI', slug: 'ai-image-editing' },
      { name: 'Tạo chatbot FAQ', slug: 'faq-chatbot-setup' },
      { name: 'Thiết lập chatbot website', slug: 'web-chatbot-setup' },
      { name: 'Tạo chatbot chăm sóc khách hàng', slug: 'cs-chatbot-setup' },
      { name: 'Tự động hóa Google Sheets', slug: 'google-sheets-automation' },
      { name: 'Viết Google Apps Script', slug: 'apps-script-dev' },
      { name: 'Tạo workflow bằng Make', slug: 'make-workflow' },
      { name: 'Tạo workflow bằng Zapier', slug: 'zapier-workflow' },
      { name: 'Tạo workflow bằng n8n', slug: 'n8n-workflow' },
      { name: 'Tự động gửi email', slug: 'email-automation' },
      { name: 'Tự động nhập dữ liệu', slug: 'data-entry-automation' },
      { name: 'Tự động tạo báo cáo', slug: 'report-generation-automation' },
      { name: 'Gắn nhãn dữ liệu', slug: 'data-labeling' },
      { name: 'Phân loại dữ liệu', slug: 'data-sorting' },
      { name: 'Kiểm tra nội dung do AI tạo', slug: 'ai-content-audit' }
    ]
  }
];

(async () => {
  console.log('Seeding categories and subcategories (skills) into PostgreSQL database...');
  try {
    console.log('🧹 Clearing existing skills (skills)...');
    await pool.query('TRUNCATE TABLE skills CASCADE;');
    
    console.log('🧹 Clearing existing categories (CASCADE)...');
    await pool.query('TRUNCATE TABLE categories CASCADE;');

    for (const cat of CATEGORIES_TO_SEED) {
      // 1. Insert parent Category
      const catInsert = await pool.query(
        'INSERT INTO categories (id, name, slug) VALUES (gen_random_uuid(), $1, $2) RETURNING id',
        [cat.name, cat.slug]
      );
      const categoryId = catInsert.rows[0].id;
      console.log(`✅ Seeded category: ${cat.name} (${cat.slug}) -> UUID: ${categoryId}`);

      // 2. Insert associated Skills as subcategories
      if (cat.subcategories && cat.subcategories.length > 0) {
        for (const sub of cat.subcategories) {
          await pool.query(
            'INSERT INTO skills (id, category_id, name, slug) VALUES (gen_random_uuid(), $1, $2, $3)',
            [categoryId, sub.name, sub.slug]
          );
        }
        console.log(`   └─ Seeded ${cat.subcategories.length} subcategories for ${cat.name}`);
      }
    }
    console.log('🎉 Database seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await pool.end();
  }
})();
