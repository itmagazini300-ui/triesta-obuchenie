async function request(path, options = {}) {
  const res = await fetch('/api' + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Възникна грешка. Опитай отново.');
  return data;
}

export const api = {
  me: () => request('/auth/me'),
  login: (login, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ login, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  catalog: () => request('/learn/catalog'),
  module: (id) => request('/learn/modules/' + id),
  openModule: (id) => request('/learn/modules/' + id + '/open', { method: 'POST' }),
  submitTest: (id, answers) => request('/learn/modules/' + id + '/submit', { method: 'POST', body: JSON.stringify({ answers }) }),
  certificates: () => request('/learn/certificates'),
  videos: () => request('/learn/videos'),
  welcomeSeen: () => request('/learn/welcome-seen', { method: 'POST' }),
  disc: () => request('/learn/disc'),
  submitDisc: (answers) => request('/learn/disc', { method: 'POST', body: JSON.stringify({ answers }) }),

  managerOverview: () => request('/manager/overview'),
  managerEmployee: (id) => request('/manager/employees/' + id),
  managerMentors: () => request('/manager/mentors'),
  managerApplications: () => request('/manager/applications'),
  updateApplication: (id, status) => request('/manager/applications/' + id, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteApplication: (id) => request('/manager/applications/' + id, { method: 'DELETE' }),
  discRequests: () => request('/manager/disc-requests'),
  discRequestCount: () => request('/manager/disc-requests/count'),
  approveDiscRequest: (id, mentorId) => request('/manager/disc-requests/' + id + '/approve', { method: 'POST', body: JSON.stringify({ mentorId }) }),
  rejectDiscRequest: (id) => request('/manager/disc-requests/' + id + '/reject', { method: 'POST' }),
  completeMentee: (id) => request('/manager/mentees/' + id + '/complete', { method: 'POST' }),

  // публично – без вход
  apply: (data) => request('/apply', { method: 'POST', body: JSON.stringify(data) }),
  publicDisc: () => request('/public/disc'),
  publicDiscCheck: (phone) => request('/public/disc/check', { method: 'POST', body: JSON.stringify({ phone }) }),
  publicDiscSubmit: (data) => request('/public/disc', { method: 'POST', body: JSON.stringify(data) }),

  // ── админ: съдържание ──
  adminCategories: () => request('/admin/categories'),
  adminCategory: (id) => request('/admin/categories/' + id),
  adminCreateCategory: (data) => request('/admin/categories', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateCategory: (id, data) => request('/admin/categories/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteCategory: (id) => request('/admin/categories/' + id, { method: 'DELETE' }),
  adminMoveCategory: (id, dir) => request('/admin/categories/' + id + '/move', { method: 'POST', body: JSON.stringify({ dir }) }),

  adminModule: (id) => request('/admin/modules/' + id),
  adminCreateModule: (data) => request('/admin/modules', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateModule: (id, data) => request('/admin/modules/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteModule: (id) => request('/admin/modules/' + id, { method: 'DELETE' }),
  adminMoveModule: (id, dir) => request('/admin/modules/' + id + '/move', { method: 'POST', body: JSON.stringify({ dir }) }),

  adminCreateQuestion: (data) => request('/admin/questions', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateQuestion: (id, data) => request('/admin/questions/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteQuestion: (id) => request('/admin/questions/' + id, { method: 'DELETE' }),
  adminMoveQuestion: (id, dir) => request('/admin/questions/' + id + '/move', { method: 'POST', body: JSON.stringify({ dir }) }),
  adminImportQuestions: (moduleId, text) => request('/admin/modules/' + moduleId + '/import-questions', { method: 'POST', body: JSON.stringify({ text }) }),

  // ── админ: видео уроци ──
  adminVideos: () => request('/admin/videos'),
  adminCreateVideo: (data) => request('/admin/videos', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateVideo: (id, data) => request('/admin/videos/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteVideo: (id) => request('/admin/videos/' + id, { method: 'DELETE' }),
  adminMoveVideo: (id, dir) => request('/admin/videos/' + id + '/move', { method: 'POST', body: JSON.stringify({ dir }) }),

  // ── админ: потребители ──
  adminUsers: () => request('/admin/users'),
  adminCreateUser: (data) => request('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateUser: (id, data) => request('/admin/users/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteUser: (id) => request('/admin/users/' + id, { method: 'DELETE' }),

  // ── админ: магазини ──
  adminStores: () => request('/admin/stores'),
  adminCreateStore: (data) => request('/admin/stores', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateStore: (id, data) => request('/admin/stores/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteStore: (id) => request('/admin/stores/' + id, { method: 'DELETE' }),
};
