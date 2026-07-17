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
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  catalog: () => request('/learn/catalog'),
  module: (id) => request('/learn/modules/' + id),
  openModule: (id) => request('/learn/modules/' + id + '/open', { method: 'POST' }),
  submitTest: (id, answers) => request('/learn/modules/' + id + '/submit', { method: 'POST', body: JSON.stringify({ answers }) }),
  certificates: () => request('/learn/certificates'),
  welcomeSeen: () => request('/learn/welcome-seen', { method: 'POST' }),
  disc: () => request('/learn/disc'),
  submitDisc: (answers) => request('/learn/disc', { method: 'POST', body: JSON.stringify({ answers }) }),

  managerOverview: () => request('/manager/overview'),
  managerEmployee: (id) => request('/manager/employees/' + id),
  managerMentors: () => request('/manager/mentors'),

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

  // ── админ: потребители ──
  adminUsers: () => request('/admin/users'),
  adminCreateUser: (data) => request('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateUser: (id, data) => request('/admin/users/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteUser: (id) => request('/admin/users/' + id, { method: 'DELETE' }),
};
