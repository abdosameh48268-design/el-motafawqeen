/* ===================================
   منصة تعليمية - المنطق الرئيسي
   =================================== */

'use strict';

// ===== إدارة البيانات =====
const DB = {
  KEYS: {
    COURSES: 'edu_courses',
    PROGRESS: 'edu_progress',
    ADMIN_SESSION: 'edu_admin_session',
    VIEWS: 'edu_views',
    QUIZZES: 'edu_quizzes',
    QUIZ_RESULTS: 'edu_quiz_results',
    STUDENTS: 'edu_students',
    STUDENT_SESSION: 'edu_student_session',
  },

  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || null;
    } catch { return null; }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch { return false; }
  },

  getCourses() {
    return this.get(this.KEYS.COURSES) || [];
  },

  saveCourses(courses) {
    return this.set(this.KEYS.COURSES, courses);
  },

  getProgress() {
    return this.get(this.KEYS.PROGRESS) || {};
  },

  saveProgress(progress) {
    return this.set(this.KEYS.PROGRESS, progress);
  },

  isAdminLoggedIn() {
    return this.get(this.KEYS.ADMIN_SESSION) === true;
  },

  adminLogin(username, password) {
    if (username === 'admin' && password === 'admin') {
      this.set(this.KEYS.ADMIN_SESSION, true);
      return true;
    }
    return false;
  },

  adminLogout() {
    localStorage.removeItem(this.KEYS.ADMIN_SESSION);
  },

  // ===== المشاهدات =====
  getViews() {
    return this.get(this.KEYS.VIEWS) || {};
  },
  recordView(courseId, lessonId) {
    const views = this.getViews();
    const key = `${courseId}_${lessonId}`;
    views[key] = (views[key] || 0) + 1;
    this.set(this.KEYS.VIEWS, views);
  },
  getLessonViews(courseId, lessonId) {
    return (this.getViews()[`${courseId}_${lessonId}`]) || 0;
  },
  getCourseViews(courseId) {
    const views = this.getViews();
    return Object.keys(views).filter(k => k.startsWith(courseId + '_')).reduce((s, k) => s + views[k], 0);
  },
  getTotalViews() {
    return Object.values(this.getViews()).reduce((s, v) => s + v, 0);
  },

  // ===== الامتحانات =====
  getQuizzes() { return this.get(this.KEYS.QUIZZES) || []; },
  saveQuizzes(q) { return this.set(this.KEYS.QUIZZES, q); },
  getQuizResults() { return this.get(this.KEYS.QUIZ_RESULTS) || []; },
  saveQuizResult(result) {
    const results = this.getQuizResults();
    results.push({ ...result, date: new Date().toISOString() });
    return this.set(this.KEYS.QUIZ_RESULTS, results);
  },
  getQuizByCourse(courseId) {
    return this.getQuizzes().find(q => q.courseId === courseId) || null;
  },
  getQuizByLesson(lessonId) {
    return this.getQuizzes().find(q => q.lessonId === lessonId) || null;
  },

  // ===== الطلاب =====
  getStudents() { return this.get(this.KEYS.STUDENTS) || []; },
  saveStudents(s) { return this.set(this.KEYS.STUDENTS, s); },

  registerStudent({ name, phone, password }) {
    const students = this.getStudents();
    if (students.find(s => s.phone === phone)) return { ok: false, msg: 'رقم الهاتف مسجل مسبقاً' };
    const student = { id: 'stu_' + Date.now(), name, phone, password, joinedAt: new Date().toISOString() };
    students.push(student);
    this.saveStudents(students);
    return { ok: true, student };
  },

  studentLogin(phone, password) {
    const student = this.getStudents().find(s => s.phone === phone && s.password === password);
    if (!student) return { ok: false, msg: 'رقم الهاتف أو كلمة المرور غير صحيحة' };
    this.set(this.KEYS.STUDENT_SESSION, student.id);
    return { ok: true, student };
  },

  getStudentSession() {
    const id = this.get(this.KEYS.STUDENT_SESSION);
    if (!id) return null;
    return this.getStudents().find(s => s.id === id) || null;
  },

  studentLogout() { localStorage.removeItem(this.KEYS.STUDENT_SESSION); },

  isStudentLoggedIn() { return !!this.getStudentSession(); },

  getStudentProgress(studentId) {
    const all = this.getProgress();
    const result = {};
    Object.keys(all).filter(k => k.startsWith(studentId + '|')).forEach(k => { result[k] = all[k]; });
    return result;
  }
};

// ===== الإشعارات =====
const Notify = {
  container: null,

  init() {
    this.container = document.getElementById('notifications');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notifications';
      this.container.className = 'notifications-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', duration = 3500) {
    if (!this.container) this.init();

    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const el = document.createElement('div');
    el.className = `notification ${type}`;
    el.innerHTML = `<span class="notification-icon">${icons[type]}</span><span>${message}</span>`;
    this.container.appendChild(el);

    setTimeout(() => {
      el.style.animation = 'slideInLeft 0.3s ease reverse';
      setTimeout(() => el.remove(), 300);
    }, duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error'); },
  info(msg)    { this.show(msg, 'info'); },
  warning(msg) { this.show(msg, 'warning'); }
};

// ===== مساعدات عامة =====
const Utils = {
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  getUrlParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  },

  setUrlParam(name, value) {
    const url = new URL(window.location);
    url.searchParams.set(name, value);
    window.history.replaceState({}, '', url);
  },

  // استخراج معرف فيديو يوتيوب
  extractYouTubeId(url) {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return url.length === 11 ? url : null;
  },

  // حساب نسبة التقدم
  getCourseProgress(courseId) {
    const courses = DB.getCourses();
    const course = courses.find(c => c.id === courseId);
    if (!course || !course.lessons || course.lessons.length === 0) return 0;

    const progress = DB.getProgress();
    const completed = course.lessons.filter(l => progress[`${courseId}_${l.id}`]).length;
    return Math.round((completed / course.lessons.length) * 100);
  },

  // قراءة ملف كـ base64
  readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('فشل قراءة الملف'));
      reader.readAsDataURL(file);
    });
  },

  // تنسيق التاريخ
  formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ar-EG');
  }
};

// ===== شريط التنقل =====
function initNavbar() {
  const toggler = document.querySelector('.navbar-toggler');
  const nav = document.querySelector('.navbar-nav');
  if (toggler && nav) {
    toggler.addEventListener('click', () => nav.classList.toggle('open'));
  }

  // تحديد الرابط النشط
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.includes(currentPage)) link.classList.add('active');
  });

  // عرض اسم الطالب لو مسجل دخول
  const student = DB.getStudentSession();
  const studentArea = document.getElementById('studentNavArea');
  if (studentArea) {
    if (student) {
      studentArea.innerHTML = `
        <span style="color:var(--gold);font-size:.9rem;font-weight:700">👋 ${student.name}</span>
        <button onclick="DB.studentLogout();window.location.href='student-login.html'"
          class="nav-link" style="background:rgba(255,255,255,.08);border:none;cursor:pointer;font-size:.82rem">
          خروج
        </button>`;
    } else {
      studentArea.innerHTML = `<a href="student-login.html" class="nav-link" style="background:rgba(245,166,35,.15);color:var(--gold);border:1px solid rgba(245,166,35,.3)">🎓 دخول الطلاب</a>`;
    }
  }
}

// ===== الصفحة الرئيسية =====
function initHomePage() {
  seedDemoData();
  renderCourses();
  initSearch();
  initFilters();
  updateHomeStats();
}

// بيانات تجريبية
function seedDemoData() {
  const existing = DB.getCourses();
  if (existing.length > 0) return;

  const demo = [
    {
      id: Utils.generateId(),
      title: 'أساسيات تطوير الويب',
      description: 'تعلم HTML وCSS وJavaScript من الصفر حتى الاحتراف مع مشاريع عملية',
      category: 'برمجة',
      thumbnail: '',
      emoji: '💻',
      createdAt: new Date().toISOString(),
      lessons: [
        { id: Utils.generateId(), title: 'مقدمة إلى HTML', videoUrl: 'dQw4w9WgXcQ', pdfUrl: '', pdfName: '' },
        { id: Utils.generateId(), title: 'أساسيات CSS', videoUrl: 'dQw4w9WgXcQ', pdfUrl: '', pdfName: '' },
        { id: Utils.generateId(), title: 'JavaScript للمبتدئين', videoUrl: 'dQw4w9WgXcQ', pdfUrl: '', pdfName: '' },
      ]
    },
    {
      id: Utils.generateId(),
      title: 'تصميم الجرافيك',
      description: 'احترف تصميم الجرافيك باستخدام أدوب فوتوشوب وإليستريتور خطوة بخطوة',
      category: 'تصميم',
      thumbnail: '',
      emoji: '🎨',
      createdAt: new Date().toISOString(),
      lessons: [
        { id: Utils.generateId(), title: 'مقدمة في التصميم', videoUrl: 'dQw4w9WgXcQ', pdfUrl: '', pdfName: '' },
        { id: Utils.generateId(), title: 'نظرية الألوان', videoUrl: 'dQw4w9WgXcQ', pdfUrl: '', pdfName: '' },
      ]
    },
    {
      id: Utils.generateId(),
      title: 'التسويق الرقمي',
      description: 'استراتيجيات التسويق عبر الإنترنت وسوشيال ميديا لتنمية أعمالك',
      category: 'تسويق',
      thumbnail: '',
      emoji: '📱',
      createdAt: new Date().toISOString(),
      lessons: [
        { id: Utils.generateId(), title: 'أساسيات التسويق الرقمي', videoUrl: 'dQw4w9WgXcQ', pdfUrl: '', pdfName: '' },
        { id: Utils.generateId(), title: 'إدارة السوشيال ميديا', videoUrl: 'dQw4w9WgXcQ', pdfUrl: '', pdfName: '' },
        { id: Utils.generateId(), title: 'إعلانات جوجل', videoUrl: 'dQw4w9WgXcQ', pdfUrl: '', pdfName: '' },
        { id: Utils.generateId(), title: 'تحليل البيانات', videoUrl: 'dQw4w9WgXcQ', pdfUrl: '', pdfName: '' },
      ]
    }
  ];

  DB.saveCourses(demo);
}

// رسم الكورسات
function renderCourses(courses = null, searchQuery = '', activeCategory = 'all') {
  const grid = document.getElementById('coursesGrid');
  if (!grid) return;

  const allCourses = courses || DB.getCourses();
  let filtered = allCourses;

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
  }

  if (activeCategory && activeCategory !== 'all') {
    filtered = filtered.filter(c => c.category === activeCategory);
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="icon">🔍</div>
        <h3>لا توجد كورسات</h3>
        <p>${searchQuery ? 'لم يتم العثور على نتائج لـ "' + searchQuery + '"' : 'لم يتم إضافة أي كورسات بعد'}</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map((course, i) => {
    const progress = Utils.getCourseProgress(course.id);
    const lessonsCount = course.lessons ? course.lessons.length : 0;
    const thumbnail = course.thumbnail
      ? `<img src="${course.thumbnail}" alt="${course.title}" onerror="this.parentElement.innerHTML='<div class=\\'course-thumbnail-placeholder\\'>${course.emoji || '📚'}</div>'">`
      : `<div class="course-thumbnail-placeholder">${course.emoji || '📚'}</div>`;

    return `
    <div class="course-card" style="animation-delay:${i * 0.1}s" onclick="window.location.href='course.html?id=${course.id}'">
      <div class="course-thumbnail">
        ${thumbnail}
        <div class="course-category-badge">${course.category}</div>
        <div class="lessons-count-badge">📖 ${lessonsCount} درس</div>
      </div>
      <div class="course-body">
        <div class="course-title">${course.title}</div>
        <div class="course-description">${course.description}</div>
        <div class="progress-wrapper">
          <div class="progress-label">
            <span>التقدم</span>
            <span>${progress}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${progress}%"></div>
          </div>
        </div>
        <a href="course.html?id=${course.id}" class="btn-course">ابدأ التعلم ←</a>
      </div>
    </div>`;
  }).join('');
}

// البحث
function initSearch() {
  const input = document.getElementById('searchInput');
  if (!input) return;

  let timeout;
  input.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      const activeBtn = document.querySelector('.filter-btn.active');
      const cat = activeBtn ? activeBtn.dataset.category : 'all';
      renderCourses(null, input.value.trim(), cat);
    }, 300);
  });
}

// الفلترة
function initFilters() {
  const btns = document.querySelectorAll('.filter-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const searchInput = document.getElementById('searchInput');
      const q = searchInput ? searchInput.value.trim() : '';
      renderCourses(null, q, btn.dataset.category);
    });
  });
}

// تحديث إحصائيات الصفحة الرئيسية
function updateHomeStats() {
  const courses = DB.getCourses();
  const totalLessons = courses.reduce((sum, c) => sum + (c.lessons ? c.lessons.length : 0), 0);
  const categories = [...new Set(courses.map(c => c.category))];

  const el = (id) => document.getElementById(id);
  if (el('statCourses')) el('statCourses').textContent = courses.length;
  if (el('statLessons')) el('statLessons').textContent = totalLessons;
  if (el('statCategories')) el('statCategories').textContent = categories.length;

  // تحديث أزرار الفلترة
  const filterContainer = document.getElementById('filterButtons');
  if (filterContainer) {
    const cats = ['all', ...categories];
    const labels = { all: 'الكل' };
    filterContainer.innerHTML = cats.map(cat => `
      <button class="filter-btn ${cat === 'all' ? 'active' : ''}" data-category="${cat}">${labels[cat] || cat}</button>
    `).join('');
    initFilters();
  }
}

// ===== صفحة الكورس =====
function initCoursePage() {
  const courseId = Utils.getUrlParam('id');
  if (!courseId) { window.location.href = 'index.html'; return; }

  const courses = DB.getCourses();
  const course = courses.find(c => c.id === courseId);
  if (!course) { window.location.href = 'index.html'; return; }

  renderCourseDetails(course);
}

function renderCourseDetails(course) {
  // العنوان والوصف
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };
  setEl('courseTitle', course.title);
  setEl('courseDesc', course.description);
  setEl('courseCategoryBadge', course.category);
  setEl('courseLessonsCount', `${course.lessons ? course.lessons.length : 0} درس`);
  setEl('courseCreatedAt', Utils.formatDate(course.createdAt));

  // الصورة
  const thumbEl = document.getElementById('courseThumbnailHero');
  if (thumbEl) {
    if (course.thumbnail) {
      thumbEl.innerHTML = `<img src="${course.thumbnail}" alt="${course.title}" style="width:100%;height:100%;object-fit:cover;border-radius:16px">`;
    } else {
      thumbEl.innerHTML = `<div style="font-size:5rem;text-align:center;padding:2rem">${course.emoji || '📚'}</div>`;
    }
  }

  // التقدم
  const progress = Utils.getCourseProgress(course.id);
  updateProgressCircle(progress);

  // الدروس
  renderLessonsList(course);

  // عنوان الصفحة
  document.title = course.title + ' | منصة تعليمية';
}

function updateProgressCircle(percent) {
  const el = document.getElementById('progressPercent');
  if (el) el.textContent = percent + '%';

  const circle = document.getElementById('progressCircle');
  if (circle) {
    const circumference = 2 * Math.PI * 50;
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = offset;
  }
}

function renderLessonsList(course) {
  const list = document.getElementById('lessonsList');
  if (!list) return;

  const progress = DB.getProgress();
  const lessons = course.lessons || [];

  if (lessons.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="icon">📭</div><h3>لا توجد دروس بعد</h3></div>`;
    return;
  }

  list.innerHTML = lessons.map((lesson, i) => {
    const isCompleted = !!progress[`${course.id}_${lesson.id}`];
    const hasVideo = !!lesson.videoUrl;
    const hasPdf = !!lesson.pdfUrl;

    return `
    <a class="lesson-item ${isCompleted ? 'completed' : ''}"
       href="lesson.html?courseId=${course.id}&lessonId=${lesson.id}">
      <div class="lesson-num">${isCompleted ? '✓' : i + 1}</div>
      <div class="lesson-info">
        <div class="lesson-title-text">${lesson.title}</div>
        <div class="lesson-meta-tags">
          ${hasVideo ? '<span class="tag has-video">🎥 فيديو</span>' : ''}
          ${hasPdf ? '<span class="tag has-pdf">📄 PDF</span>' : ''}
        </div>
      </div>
      <div class="lesson-check">${isCompleted ? '✓' : ''}</div>
    </a>`;
  }).join('');
}

// ===== صفحة الدرس =====
function initLessonPage() {
  const courseId = Utils.getUrlParam('courseId');
  const lessonId = Utils.getUrlParam('lessonId');
  if (!courseId || !lessonId) { window.location.href = 'index.html'; return; }

  const courses = DB.getCourses();
  const course = courses.find(c => c.id === courseId);
  if (!course) { window.location.href = 'index.html'; return; }

  const lesson = (course.lessons || []).find(l => l.id === lessonId);
  if (!lesson) { window.location.href = `course.html?id=${courseId}`; return; }

  renderLesson(course, lesson);
  renderSideLessons(course, lessonId);

  // تسجيل مشاهدة
  DB.recordView(courseId, lessonId);
}

function renderLesson(course, lesson) {
  // الـ breadcrumb
  const bc = document.getElementById('breadcrumb');
  if (bc) bc.innerHTML = `
    <a href="index.html">الرئيسية</a> ←
    <a href="course.html?id=${course.id}">${course.title}</a> ←
    <span>${lesson.title}</span>`;

  // عنوان الدرس
  const titleEl = document.getElementById('lessonTitle');
  if (titleEl) titleEl.textContent = lesson.title;

  // الفيديو
  const videoContainer = document.getElementById('videoContainer');
  if (videoContainer) {
    const ytId = Utils.extractYouTubeId(lesson.videoUrl);
    if (ytId) {
      videoContainer.innerHTML = `
        <iframe src="https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen></iframe>`;
    } else {
      videoContainer.innerHTML = `
        <div class="no-video">
          <div class="icon">🎬</div>
          <p>لا يوجد فيديو لهذا الدرس</p>
        </div>`;
    }
  }

  // زر الإتمام
  const progress = DB.getProgress();
  const progressKey = `${course.id}_${lesson.id}`;
  const isCompleted = !!progress[progressKey];

  const completeBtn = document.getElementById('completeBtn');
  if (completeBtn) {
    updateCompleteBtn(completeBtn, isCompleted);
    completeBtn.addEventListener('click', () => {
      const prog = DB.getProgress();
      const key = `${course.id}_${lesson.id}`;
      if (prog[key]) {
        delete prog[key];
        updateCompleteBtn(completeBtn, false);
        Notify.info('تم إلغاء تحديد الدرس كمكتمل');
      } else {
        prog[key] = true;
        updateCompleteBtn(completeBtn, true);
        Notify.success('أحسنت! تم تسجيل إتمام الدرس 🎉');
      }
      DB.saveProgress(prog);
    });
  }

  // الـ PDF
  const pdfSection = document.getElementById('pdfSection');
  if (pdfSection) {
    if (lesson.pdfUrl) {
      pdfSection.style.display = 'block';
      const pdfViewer = document.getElementById('pdfViewer');
      if (pdfViewer) pdfViewer.src = lesson.pdfUrl;

      const pdfDownload = document.getElementById('pdfDownload');
      if (pdfDownload) {
        pdfDownload.href = lesson.pdfUrl;
        pdfDownload.download = lesson.pdfName || 'ملف.pdf';
      }
    } else {
      pdfSection.style.display = 'none';
    }
  }

  document.title = lesson.title + ' | المتفوقين';

  // عرض الامتحان إن وجد
  const quizSection = document.getElementById('quizSection');
  if (quizSection) {
    const quiz = DB.getQuizByLesson(lesson.id);
    if (quiz && quiz.questions && quiz.questions.length > 0) {
      quizSection.style.display = 'block';
      renderQuizForStudent(quiz, course.id, lesson.id);
    } else {
      quizSection.style.display = 'none';
    }
  }
}

function updateCompleteBtn(btn, isCompleted) {
  if (isCompleted) {
    btn.className = 'complete-btn done';
    btn.innerHTML = '✅ تم إتمام الدرس';
  } else {
    btn.className = 'complete-btn';
    btn.innerHTML = '⬜ وضع علامة كمكتمل';
  }
}

function renderSideLessons(course, currentLessonId) {
  const list = document.getElementById('sideLessonsList');
  if (!list) return;

  const progress = DB.getProgress();
  const lessons = course.lessons || [];

  list.innerHTML = lessons.map((lesson, i) => {
    const isCompleted = !!progress[`${course.id}_${lesson.id}`];
    const isCurrent = lesson.id === currentLessonId;

    return `
    <a class="lesson-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'active' : ''}"
       href="lesson.html?courseId=${course.id}&lessonId=${lesson.id}"
       style="${isCurrent ? 'border-color:var(--accent);background:rgba(233,69,96,0.1)' : ''}">
      <div class="lesson-num">${isCompleted ? '✓' : i + 1}</div>
      <div class="lesson-info">
        <div class="lesson-title-text">${lesson.title}</div>
      </div>
    </a>`;
  }).join('');

  // زر الدرس التالي والسابق
  const currentIndex = lessons.findIndex(l => l.id === currentLessonId);
  const prevLesson = lessons[currentIndex - 1];
  const nextLesson = lessons[currentIndex + 1];

  const prevBtn = document.getElementById('prevLesson');
  const nextBtn = document.getElementById('nextLesson');

  if (prevBtn) {
    if (prevLesson) {
      prevBtn.href = `lesson.html?courseId=${course.id}&lessonId=${prevLesson.id}`;
      prevBtn.style.opacity = '1';
      prevBtn.style.pointerEvents = 'auto';
    } else {
      prevBtn.style.opacity = '0.4';
      prevBtn.style.pointerEvents = 'none';
    }
  }

  if (nextBtn) {
    if (nextLesson) {
      nextBtn.href = `lesson.html?courseId=${course.id}&lessonId=${nextLesson.id}`;
      nextBtn.style.opacity = '1';
      nextBtn.style.pointerEvents = 'auto';
    } else {
      nextBtn.style.opacity = '0.4';
      nextBtn.style.pointerEvents = 'none';
    }
  }
}

// ===== صفحة تسجيل الدخول =====
function initLoginPage() {
  if (DB.isAdminLoggedIn()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (DB.adminLogin(username, password)) {
      Notify.success('مرحباً بك يا مدير! جاري التحويل...');
      setTimeout(() => window.location.href = 'dashboard.html', 1000);
    } else {
      Notify.error('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
  });
}

// ===== امتحان الطالب =====
function renderQuizForStudent(quiz, courseId, lessonId) {
  const container = document.getElementById('quizContainer');
  if (!container) return;

  let currentQ = 0;
  let answers = {};

  function renderQuestion() {
    const q = quiz.questions[currentQ];
    const total = quiz.questions.length;
    container.innerHTML = `
      <div class="quiz-header">
        <div class="quiz-progress-text">سؤال ${currentQ + 1} من ${total}</div>
        <div class="quiz-bar"><div class="quiz-bar-fill" style="width:${((currentQ+1)/total)*100}%"></div></div>
      </div>
      <div class="quiz-question">${q.text}</div>
      <div class="quiz-options">
        ${q.options.map((opt, i) => `
          <div class="quiz-option ${answers[currentQ] === i ? 'selected' : ''}"
               onclick="selectAnswer(${i})">
            <span class="opt-letter">${['أ','ب','ج','د'][i]}</span>
            <span>${opt}</span>
          </div>`).join('')}
      </div>
      <div class="quiz-nav">
        ${currentQ > 0 ? `<button class="btn-secondary" onclick="quizPrev()">← السابق</button>` : '<span></span>'}
        ${currentQ < total - 1
          ? `<button class="btn-primary" style="width:auto;padding:10px 24px" onclick="quizNext()">التالي →</button>`
          : `<button class="btn-primary" style="width:auto;padding:10px 24px;background:linear-gradient(135deg,#2ecc71,#27ae60)" onclick="submitQuiz()">✅ إنهاء الامتحان</button>`
        }
      </div>`;
  }

  window.selectAnswer = (i) => { answers[currentQ] = i; renderQuestion(); };
  window.quizNext = () => { if (answers[currentQ] === undefined) { Notify.warning('يرجى اختيار إجابة أولاً'); return; } currentQ++; renderQuestion(); };
  window.quizPrev = () => { currentQ--; renderQuestion(); };
  window.submitQuiz = () => {
    if (answers[currentQ] === undefined) { Notify.warning('يرجى اختيار إجابة أولاً'); return; }
    let correct = 0;
    quiz.questions.forEach((q, i) => { if (answers[i] === q.correct) correct++; });
    const score = Math.round((correct / quiz.questions.length) * 100);
    DB.saveQuizResult({ quizId: quiz.id, courseId, lessonId, score, correct, total: quiz.questions.length });

    container.innerHTML = `
      <div class="quiz-result">
        <div class="result-circle ${score >= 60 ? 'pass' : 'fail'}">
          <span class="result-num">${score}%</span>
          <span class="result-lbl">${score >= 60 ? 'ناجح ✅' : 'راجع المحتوى 📖'}</span>
        </div>
        <p style="color:var(--text-muted);margin:1rem 0">أجبت على ${correct} من ${quiz.questions.length} أسئلة بشكل صحيح</p>
        <button class="btn-secondary" onclick="retakeQuiz()">🔄 إعادة الامتحان</button>
      </div>`;
  };
  window.retakeQuiz = () => { currentQ = 0; answers = {}; renderQuestion(); };

  renderQuestion();
}
function initDashboard() {
  if (!DB.isAdminLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  updateDashboardStats();
  renderCoursesTable();
  renderViewsTable();
  renderQuizzesTable();
  initSidebarNav();

  const addCourseBtn = document.getElementById('addCourseBtn');
  if (addCourseBtn) addCourseBtn.addEventListener('click', showAddCourseModal);

  const addQuizBtn = document.getElementById('addQuizBtn');
  if (addQuizBtn) addQuizBtn.addEventListener('click', openAddQuizModal);

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => {
    DB.adminLogout();
    window.location.href = 'index.html';
  });
}

function initSidebarNav() {
  const links = document.querySelectorAll('.sidebar-menu-link[data-section]');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      const target = link.dataset.section;
      document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
      const section = document.getElementById(target);
      if (section) section.classList.add('active');
    });
  });
}

// ===== لوحة التحكم =====
function updateDashboardStats() {
  const courses = DB.getCourses();
  const totalLessons = courses.reduce((sum, c) => sum + (c.lessons ? c.lessons.length : 0), 0);
  const categories = [...new Set(courses.map(c => c.category))];
  const totalViews = DB.getTotalViews();
  const totalQuizzes = DB.getQuizzes().length;

  const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  s('dashCoursesCount', courses.length);
  s('dashLessonsCount', totalLessons);
  s('dashCategoriesCount', categories.length);
  s('dashViewsCount', totalViews);
  s('dashQuizzesCount', totalQuizzes);
  s('dashStudentsCount', DB.getStudents().length);
}

function renderCoursesTable() {
  const tbody = document.getElementById('coursesTableBody');
  if (!tbody) return;

  const courses = DB.getCourses();

  if (courses.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem">لا توجد كورسات بعد</td></tr>`;
    return;
  }

  tbody.innerHTML = courses.map(course => {
    const lessonsCount = course.lessons ? course.lessons.length : 0;
    return `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:0.75rem">
          <span style="font-size:1.5rem">${course.emoji || '📚'}</span>
          <div>
            <div style="font-weight:700">${course.title}</div>
            <div style="font-size:0.8rem;color:var(--text-muted)">${Utils.formatDate(course.createdAt)}</div>
          </div>
        </div>
      </td>
      <td><span class="badge badge-accent">${course.category}</span></td>
      <td>${lessonsCount} درس</td>
      <td>
        <div class="table-actions">
          <button class="btn-success" onclick="openManageLessons('${course.id}')">📖 الدروس</button>
          <button class="btn-secondary" onclick="showEditCourseModal('${course.id}')">✏️ تعديل</button>
          <button class="btn-danger" onclick="deleteCourse('${course.id}')">🗑️ حذف</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ===== نماذج الكورسات =====
function showAddCourseModal() {
  const modal = document.getElementById('courseModal');
  const modalTitle = document.getElementById('courseModalTitle');
  const form = document.getElementById('courseForm');
  if (!modal || !form) return;

  modalTitle.textContent = 'إضافة كورس جديد';
  form.reset();
  document.getElementById('courseId').value = '';
  modal.style.display = 'flex';
}

function showEditCourseModal(courseId) {
  const modal = document.getElementById('courseModal');
  const modalTitle = document.getElementById('courseModalTitle');
  const form = document.getElementById('courseForm');
  if (!modal || !form) return;

  const courses = DB.getCourses();
  const course = courses.find(c => c.id === courseId);
  if (!course) return;

  modalTitle.textContent = 'تعديل الكورس';
  document.getElementById('courseId').value = course.id;
  document.getElementById('courseTitleInput').value = course.title;
  document.getElementById('courseDescInput').value = course.description;
  document.getElementById('courseCategoryInput').value = course.category;
  document.getElementById('courseEmojiInput').value = course.emoji || '📚';
  modal.style.display = 'flex';
}

function saveCourse(e) {
  e.preventDefault();
  const id = document.getElementById('courseId').value;
  const title = document.getElementById('courseTitleInput').value.trim();
  const description = document.getElementById('courseDescInput').value.trim();
  const category = document.getElementById('courseCategoryInput').value.trim();
  const emoji = document.getElementById('courseEmojiInput').value.trim() || '📚';

  if (!title || !description || !category) {
    Notify.error('يرجى ملء جميع الحقول المطلوبة');
    return;
  }

  const courses = DB.getCourses();

  // معالجة الصورة
  const thumbnailInput = document.getElementById('courseThumbnailInput');
  const handleSave = (thumbnail) => {
    if (id) {
      const idx = courses.findIndex(c => c.id === id);
      if (idx !== -1) {
        courses[idx] = { ...courses[idx], title, description, category, emoji, ...(thumbnail !== undefined ? { thumbnail } : {}) };
        Notify.success('تم تعديل الكورس بنجاح');
      }
    } else {
      courses.push({ id: Utils.generateId(), title, description, category, emoji, thumbnail: thumbnail || '', lessons: [], createdAt: new Date().toISOString() });
      Notify.success('تم إضافة الكورس بنجاح 🎉');
    }

    DB.saveCourses(courses);
    closeCourseModal();
    updateDashboardStats();
    renderCoursesTable();
  };

  if (thumbnailInput && thumbnailInput.files[0]) {
    Utils.readFileAsBase64(thumbnailInput.files[0])
      .then(handleSave)
      .catch(() => { Notify.error('فشل رفع الصورة'); });
  } else {
    handleSave();
  }
}

function deleteCourse(courseId) {
  if (!confirm('هل أنت متأكد من حذف هذا الكورس؟ سيتم حذف جميع دروسه أيضاً.')) return;
  const courses = DB.getCourses().filter(c => c.id !== courseId);
  DB.saveCourses(courses);
  Notify.success('تم حذف الكورس');
  updateDashboardStats();
  renderCoursesTable();
}

function closeCourseModal() {
  const modal = document.getElementById('courseModal');
  if (modal) modal.style.display = 'none';
}

// ===== إدارة الدروس =====
function openManageLessons(courseId) {
  const modal = document.getElementById('lessonsModal');
  if (!modal) return;

  modal.dataset.courseId = courseId;
  const courses = DB.getCourses();
  const course = courses.find(c => c.id === courseId);
  if (!course) return;

  document.getElementById('manageLessonsCourseTitle').textContent = course.title;
  renderManageLessonsList(course);
  modal.style.display = 'flex';
}

function renderManageLessonsList(course) {
  const list = document.getElementById('manageLessonsList');
  if (!list) return;

  const lessons = course.lessons || [];

  if (lessons.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="icon">📭</div><h3>لا توجد دروس</h3><p>أضف درسك الأول!</p></div>`;
    return;
  }

  list.innerHTML = lessons.map((lesson, i) => `
    <div class="lesson-manage-item">
      <span class="lesson-num" style="width:28px;height:28px;font-size:0.8rem">${i + 1}</span>
      <div class="lesson-manage-title">${lesson.title}</div>
      <div class="lesson-manage-actions">
        ${lesson.videoUrl ? '<span class="tag has-video">🎥</span>' : ''}
        ${lesson.pdfUrl ? '<span class="tag has-pdf">📄</span>' : ''}
        <button class="btn-secondary" style="padding:5px 10px;font-size:0.8rem" onclick="editLesson('${course.id}', '${lesson.id}')">تعديل</button>
        <button class="btn-danger" onclick="deleteLesson('${course.id}', '${lesson.id}')">حذف</button>
      </div>
    </div>`).join('');
}

function showAddLessonForm() {
  const modal = document.getElementById('lessonsModal');
  const courseId = modal.dataset.courseId;
  closeLessonsModal();

  const lessonModal = document.getElementById('lessonEditModal');
  if (!lessonModal) return;

  document.getElementById('lessonModalTitle').textContent = 'إضافة درس جديد';
  document.getElementById('lessonEditId').value = '';
  document.getElementById('lessonEditCourseId').value = courseId;
  document.getElementById('lessonTitleInput').value = '';
  document.getElementById('lessonVideoInput').value = '';
  lessonModal.style.display = 'flex';
}

function editLesson(courseId, lessonId) {
  const courses = DB.getCourses();
  const course = courses.find(c => c.id === courseId);
  const lesson = course && course.lessons ? course.lessons.find(l => l.id === lessonId) : null;
  if (!lesson) return;

  closeLessonsModal();
  const lessonModal = document.getElementById('lessonEditModal');
  if (!lessonModal) return;

  document.getElementById('lessonModalTitle').textContent = 'تعديل الدرس';
  document.getElementById('lessonEditId').value = lesson.id;
  document.getElementById('lessonEditCourseId').value = courseId;
  document.getElementById('lessonTitleInput').value = lesson.title;
  document.getElementById('lessonVideoInput').value = lesson.videoUrl || '';
  lessonModal.style.display = 'flex';
}

function saveLesson(e) {
  e.preventDefault();
  const lessonId = document.getElementById('lessonEditId').value;
  const courseId = document.getElementById('lessonEditCourseId').value;
  const title = document.getElementById('lessonTitleInput').value.trim();
  const videoUrl = document.getElementById('lessonVideoInput').value.trim();

  if (!title) { Notify.error('عنوان الدرس مطلوب'); return; }

  const pdfInput = document.getElementById('lessonPdfInput');

  const handleSave = (pdfData, pdfName) => {
    const courses = DB.getCourses();
    const courseIdx = courses.findIndex(c => c.id === courseId);
    if (courseIdx === -1) return;

    if (!courses[courseIdx].lessons) courses[courseIdx].lessons = [];

    if (lessonId) {
      const lIdx = courses[courseIdx].lessons.findIndex(l => l.id === lessonId);
      if (lIdx !== -1) {
        courses[courseIdx].lessons[lIdx] = {
          ...courses[courseIdx].lessons[lIdx],
          title, videoUrl,
          ...(pdfData ? { pdfUrl: pdfData, pdfName } : {})
        };
        Notify.success('تم تعديل الدرس');
      }
    } else {
      courses[courseIdx].lessons.push({
        id: Utils.generateId(), title, videoUrl,
        pdfUrl: pdfData || '', pdfName: pdfName || ''
      });
      Notify.success('تم إضافة الدرس 🎉');
    }

    DB.saveCourses(courses);
    closeLessonModal();
    updateDashboardStats();
    renderCoursesTable();
  };

  if (pdfInput && pdfInput.files[0]) {
    const file = pdfInput.files[0];
    if (file.size > 5 * 1024 * 1024) {
      Notify.error('حجم الملف كبير جداً (الحد الأقصى 5 ميجا)');
      return;
    }
    Utils.readFileAsBase64(file)
      .then(data => handleSave(data, file.name))
      .catch(() => Notify.error('فشل رفع الملف'));
  } else {
    handleSave(null, null);
  }
}

function deleteLesson(courseId, lessonId) {
  if (!confirm('هل أنت متأكد من حذف هذا الدرس؟')) return;
  const courses = DB.getCourses();
  const courseIdx = courses.findIndex(c => c.id === courseId);
  if (courseIdx === -1) return;

  courses[courseIdx].lessons = (courses[courseIdx].lessons || []).filter(l => l.id !== lessonId);
  DB.saveCourses(courses);
  Notify.success('تم حذف الدرس');

  renderManageLessonsList(courses[courseIdx]);
  updateDashboardStats();
  renderCoursesTable();
}

function closeLessonsModal() {
  const modal = document.getElementById('lessonsModal');
  if (modal) modal.style.display = 'none';
}

function closeLessonModal() {
  const modal = document.getElementById('lessonEditModal');
  if (modal) modal.style.display = 'none';
}

// إغلاق النماذج بالنقر خارجها
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
  }
});

// ===== إدارة المشاهدات =====
function renderViewsTable() {
  const tbody = document.getElementById('viewsTableBody');
  if (!tbody) return;

  const courses = DB.getCourses();
  const views = DB.getViews();

  if (courses.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:2rem">لا توجد بيانات بعد</td></tr>`;
    return;
  }

  let rows = [];
  courses.forEach(course => {
    (course.lessons || []).forEach(lesson => {
      const v = views[`${course.id}_${lesson.id}`] || 0;
      if (v > 0) {
        rows.push({ courseTitle: course.title, lessonTitle: lesson.title, views: v, emoji: course.emoji || '📚' });
      }
    });
  });

  rows.sort((a, b) => b.views - a.views);

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:2rem">لم يتم تسجيل أي مشاهدات بعد</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><span style="margin-left:6px">${r.emoji}</span>${r.courseTitle}</td>
      <td>${r.lessonTitle}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;height:6px;background:rgba(255,255,255,0.1);border-radius:50px;min-width:60px">
            <div style="height:100%;width:${Math.min((r.views / rows[0].views) * 100, 100)}%;background:linear-gradient(90deg,var(--accent),var(--gold));border-radius:50px"></div>
          </div>
          <span style="color:var(--accent);font-weight:700;min-width:30px">👁️ ${r.views}</span>
        </div>
      </td>
    </tr>`).join('');
}

// ===== إدارة الامتحانات =====
let editQuizCourseId = '', editQuizLessonId = '', editQuizId = '';

function renderQuizzesTable() {
  const tbody = document.getElementById('quizzesTableBody');
  if (!tbody) return;

  const quizzes = DB.getQuizzes();
  const courses = DB.getCourses();

  if (quizzes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem">لا توجد امتحانات بعد</td></tr>`;
    return;
  }

  tbody.innerHTML = quizzes.map(quiz => {
    const course = courses.find(c => c.id === quiz.courseId);
    const lesson = course ? (course.lessons || []).find(l => l.id === quiz.lessonId) : null;
    const results = DB.getQuizResults().filter(r => r.quizId === quiz.id);
    const avgScore = results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : '-';
    return `
    <tr>
      <td><strong>${quiz.title}</strong></td>
      <td>${course ? course.title : '-'}</td>
      <td>${lesson ? lesson.title : 'كل الكورس'}</td>
      <td>${quiz.questions ? quiz.questions.length : 0} سؤال</td>
      <td>
        <div class="table-actions">
          <button class="btn-secondary" style="font-size:.8rem" onclick="openEditQuizModal('${quiz.id}')">✏️ تعديل</button>
          <button class="btn-danger" onclick="deleteQuiz('${quiz.id}')">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function openAddQuizModal() {
  editQuizId = '';
  const modal = document.getElementById('quizModal');
  if (!modal) return;
  document.getElementById('quizModalTitle').textContent = 'إضافة امتحان جديد';
  document.getElementById('quizTitleInput').value = '';
  document.getElementById('quizCourseSelect').value = '';
  document.getElementById('quizLessonSelect').innerHTML = '<option value="">اختر الكورس أولاً</option>';
  document.getElementById('quizQuestionsContainer').innerHTML = '';
  populateCourseSelect('quizCourseSelect');
  modal.style.display = 'flex';
}

function openEditQuizModal(quizId) {
  editQuizId = quizId;
  const quiz = DB.getQuizzes().find(q => q.id === quizId);
  if (!quiz) return;
  const modal = document.getElementById('quizModal');
  document.getElementById('quizModalTitle').textContent = 'تعديل الامتحان';
  document.getElementById('quizTitleInput').value = quiz.title;
  populateCourseSelect('quizCourseSelect', quiz.courseId);
  updateLessonSelect(quiz.courseId, quiz.lessonId);
  renderQuestionForms(quiz.questions || []);
  modal.style.display = 'flex';
}

function populateCourseSelect(selectId, selectedId = '') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const courses = DB.getCourses();
  sel.innerHTML = `<option value="">اختر الكورس</option>` +
    courses.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.title}</option>`).join('');
}

function updateLessonSelect(courseId, selectedLessonId = '') {
  const sel = document.getElementById('quizLessonSelect');
  if (!sel) return;
  const course = DB.getCourses().find(c => c.id === courseId);
  const lessons = course ? (course.lessons || []) : [];
  sel.innerHTML = `<option value="">على مستوى الكورس كله</option>` +
    lessons.map(l => `<option value="${l.id}" ${l.id === selectedLessonId ? 'selected' : ''}>${l.title}</option>`).join('');
}

function renderQuestionForms(questions = []) {
  const container = document.getElementById('quizQuestionsContainer');
  if (!container) return;
  container.innerHTML = questions.map((q, i) => buildQuestionForm(i, q)).join('');
}

function buildQuestionForm(index, q = {}) {
  return `
  <div class="question-form" id="qform-${index}" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:1rem;margin-bottom:.75rem">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem">
      <strong style="font-size:.9rem">السؤال ${index + 1}</strong>
      <button type="button" class="btn-danger" onclick="removeQuestion(${index})">حذف</button>
    </div>
    <div class="form-group">
      <label class="form-label">نص السؤال</label>
      <input type="text" class="form-control q-text" placeholder="اكتب السؤال هنا..." value="${q.text || ''}">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:.5rem">
      ${['أ','ب','ج','د'].map((letter, oi) => `
        <div class="form-group">
          <label class="form-label">${letter}</label>
          <input type="text" class="form-control q-opt" placeholder="الإجابة ${letter}..." value="${(q.options && q.options[oi]) || ''}">
        </div>`).join('')}
    </div>
    <div class="form-group">
      <label class="form-label">الإجابة الصحيحة</label>
      <select class="form-control q-correct">
        ${['أ (0)','ب (1)','ج (2)','د (3)'].map((l, i) => `<option value="${i}" ${q.correct === i ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
    </div>
  </div>`;
}

function addQuestion() {
  const container = document.getElementById('quizQuestionsContainer');
  if (!container) return;
  const count = container.querySelectorAll('.question-form').length;
  container.insertAdjacentHTML('beforeend', buildQuestionForm(count));
}

function removeQuestion(index) {
  const el = document.getElementById(`qform-${index}`);
  if (el) { el.remove(); renumberQuestions(); }
}

function renumberQuestions() {
  document.querySelectorAll('.question-form').forEach((el, i) => {
    el.id = `qform-${i}`;
    const title = el.querySelector('strong');
    if (title) title.textContent = `السؤال ${i + 1}`;
    el.querySelectorAll('[onclick]').forEach(btn => {
      btn.setAttribute('onclick', btn.getAttribute('onclick').replace(/\d+/, i));
    });
  });
}

function saveQuiz() {
  const title = document.getElementById('quizTitleInput').value.trim();
  const courseId = document.getElementById('quizCourseSelect').value;
  const lessonId = document.getElementById('quizLessonSelect').value;

  if (!title || !courseId) { Notify.error('عنوان الامتحان والكورس مطلوبان'); return; }

  const questions = [];
  document.querySelectorAll('.question-form').forEach(form => {
    const text = form.querySelector('.q-text').value.trim();
    const opts = [...form.querySelectorAll('.q-opt')].map(i => i.value.trim());
    const correct = parseInt(form.querySelector('.q-correct').value);
    if (text && opts.every(o => o)) questions.push({ text, options: opts, correct });
  });

  if (questions.length === 0) { Notify.error('أضف سؤالاً واحداً على الأقل'); return; }

  const quizzes = DB.getQuizzes();
  if (editQuizId) {
    const idx = quizzes.findIndex(q => q.id === editQuizId);
    if (idx !== -1) { quizzes[idx] = { ...quizzes[idx], title, courseId, lessonId, questions }; }
    Notify.success('تم تعديل الامتحان');
  } else {
    quizzes.push({ id: Utils.generateId(), title, courseId, lessonId, questions });
    Notify.success('تم إضافة الامتحان 🎉');
  }

  DB.saveQuizzes(quizzes);
  document.getElementById('quizModal').style.display = 'none';
  updateDashboardStats();
  renderQuizzesTable();
}

function deleteQuiz(quizId) {
  if (!confirm('حذف هذا الامتحان؟')) return;
  DB.saveQuizzes(DB.getQuizzes().filter(q => q.id !== quizId));
  Notify.success('تم الحذف');
  updateDashboardStats();
  renderQuizzesTable();
}

function closeQuizModal() {
  const modal = document.getElementById('quizModal');
  if (modal) modal.style.display = 'none';
}

// ===== التهيئة العامة =====
document.addEventListener('DOMContentLoaded', () => {
  Notify.init();
  initNavbar();

  const page = window.location.pathname.split('/').pop() || 'index.html';

  if (page === 'index.html' || page === '') initHomePage();
  else if (page === 'course.html') initCoursePage();
  else if (page === 'lesson.html') initLessonPage();
  else if (page === 'login.html') initLoginPage();
  else if (page === 'dashboard.html') initDashboard();
  else if (page === 'student-login.html') initStudentLoginPage();
  else if (page === 'student-register.html') initStudentRegisterPage();
});

// ===== صفحة دخول الطلاب =====
function initStudentLoginPage() {
  // لو مسجل دخول ابعته للرئيسية
  if (DB.isStudentLoggedIn()) { window.location.href = 'index.html'; return; }

  const form = document.getElementById('studentLoginForm');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const phone    = document.getElementById('st-phone').value.trim();
    const password = document.getElementById('st-password').value;
    const result   = DB.studentLogin(phone, password);
    if (result.ok) {
      Notify.success(`أهلاً ${result.student.name}! 🎉`);
      setTimeout(() => window.location.href = 'index.html', 800);
    } else {
      Notify.error(result.msg);
    }
  });
}

// ===== صفحة تسجيل الطلاب =====
function initStudentRegisterPage() {
  if (DB.isStudentLoggedIn()) { window.location.href = 'index.html'; return; }

  const form = document.getElementById('studentRegisterForm');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name     = document.getElementById('st-name').value.trim();
    const phone    = document.getElementById('st-phone').value.trim();
    const password = document.getElementById('st-password').value;
    const confirm  = document.getElementById('st-confirm').value;

    if (!name || name.length < 3)         { Notify.error('الاسم لازم يكون 3 حروف على الأقل'); return; }
    if (!/^01[0125]\d{8}$/.test(phone))   { Notify.error('رقم الهاتف غير صحيح — لازم يبدأ بـ 010/011/012/015'); return; }
    if (password.length < 6)              { Notify.error('كلمة المرور لازم تكون 6 أحرف على الأقل'); return; }
    if (password !== confirm)             { Notify.error('كلمة المرور غير متطابقة'); return; }

    const result = DB.registerStudent({ name, phone, password });
    if (result.ok) {
      DB.set(DB.KEYS.STUDENT_SESSION, result.student.id);
      Notify.success('تم التسجيل بنجاح! أهلاً ' + name + ' 🎉');
      setTimeout(() => window.location.href = 'index.html', 800);
    } else {
      Notify.error(result.msg);
    }
  });
}
