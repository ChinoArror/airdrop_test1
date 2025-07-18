// 依赖引入
import { html, render } from 'https://esm.sh/htm/preact';
import { createHash } from 'node:crypto';

// 工具函数：密码哈希
const hashPassword = (password) => {
  return createHash('sha256').update(password).digest('hex');
};

// 初始化管理员账户（首次运行）
async function initAdmin() {
  const adminExists = await DB.prepare(
    'SELECT * FROM users WHERE username = ?'
  ).bind(ADMIN_USERNAME).first();
  
  if (!adminExists) {
    await DB.prepare(
      'INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)'
    ).bind(ADMIN_USERNAME, hashPassword(ADMIN_PASSWORD)).run();
  }
}

// 前端组件
const App = ({ user, texts, files, onUpload, onSendText, onDelete }) => html`
  <div class="container">
    <!-- 导航栏 -->
    <nav class="navbar">
      <h1>多端协作平台</h1>
      ${user ? html`
        <div class="user-info">
          <span>${user.username}</span>
          ${user.is_admin ? html`<a href="/admin">管理员</a>` : ''}
          <button onclick=${() => fetch('/logout', { method: 'POST' }).then(() => location.reload())}>退出</button>
        </div>
      ` : ''}
    </nav>

    <!-- 登录/注册界面 -->
    ${!user ? html`
      <div class="auth-form">
        <h2>登录</h2>
        <form onsubmit=${async (e) => {
          e.preventDefault();
          const res = await fetch('/login', {
            method: 'POST',
            body: JSON.stringify({
              username: e.target.username.value,
              password: e.target.password.value
            }),
            headers: { 'Content-Type': 'application/json' }
          });
          if (res.ok) location.reload();
        }}>
          <input name="username" placeholder="用户名" required />
          <input name="password" type="password" placeholder="密码" required />
          <button type="submit">登录</button>
        </form>
      </div>
    ` : html`
      <!-- 主功能区 -->
      <div class="main-content">
        <!-- 文本发送区 -->
        <div class="text-area">
          <h3>发送文本</h3>
          <form onsubmit=${async (e) => {
            e.preventDefault();
            await onSendText(e.target.content.value);
            e.target.content.value = '';
          }}>
            <textarea name="content" required></textarea>
            <button type="submit">发送</button>
          </form>
        </div>

        <!-- 文件上传区 -->
        <div class="upload-area">
          <h3>上传文件</h3>
          <input type="file" multiple onchange=${onUpload} />
        </div>

        <!-- 历史记录区 -->
        <div class="history">
          <h3>历史记录</h3>
          <div class="texts">
            ${texts.map(t => html`
              <div class="text-item">
                <p>${t.content}</p>
                <small>${new Date(t.created_at).toLocaleString()}</small>
                <button onclick=${() => onDelete('text', t.id)}>删除</button>
              </div>
            `)}
          </div>
          <div class="files">
            ${files.map(f => html`
              <div class="file-item">
                <a href="/file/${f.file_key}" target="_blank">${f.filename}</a>
                <small>${f.size}B · ${f.file_type}</small>
                <button onclick=${() => onDelete('file', f.id, f.file_key)}>删除</button>
              </div>
            `)}
          </div>
        </div>
      </div>
    `}
  </div>
`;

// 管理员界面组件
const AdminPanel = ({ users, onAddUser }) => html`
  <div class="admin-container">
    <h2>管理员面板</h2>
    <div class="user-management">
      <h3>用户管理</h3>
      <form onsubmit=${async (e) => {
        e.preventDefault();
        await onAddUser(e.target.username.value, e.target.password.value);
        e.target.reset();
      }}>
        <input name="username" placeholder="新用户名" required />
        <input name="password" type="password" placeholder="密码" required />
        <button type="submit">添加用户</button>
      </form>
      <table>
        <tr><<th>用户名</</th><<th>角色</</th><<th>创建时间</</th></tr>
        ${users.map(u => html`
          <tr>
            <td>${u.username}</td>
            <td>${u.is_admin ? '管理员' : '用户'}</td>
            <td>${new Date(u.created_at).toLocaleString()}</td>
          </tr>
        `)}
      </table>
    </div>
    <a href="/" class="back-link">返回首页</a>
  </div>
`;

// 后端逻辑
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  await initAdmin(); // 确保管理员账户存在

  // 路由处理
  if (url.pathname === '/') {
    return handleHome(request);
  } else if (url.pathname === '/login' && request.method === 'POST') {
    return handleLogin(request);
  } else if (url.pathname === '/logout' && request.method === 'POST') {
    return handleLogout();
  } else if (url.pathname === '/send-text' && request.method === 'POST') {
    return handleSendText(request);
  } else if (url.pathname === '/upload' && request.method === 'POST') {
    return handleUpload(request);
  } else if (url.pathname.startsWith('/file/')) {
    return handleFileDownload(url.pathname.split('/')[2]);
  } else if (url.pathname === '/delete' && request.method === 'POST') {
    return handleDelete(request);
  } else if (url.pathname === '/admin') {
    return handleAdminPanel(request);
  } else if (url.pathname === '/add-user' && request.method === 'POST') {
    return handleAddUser(request);
  }

  return new Response('Not found', { status: 404 });
}

// 路由实现函数（省略具体实现，包含用户认证、数据CRUD、文件上传下载等逻辑）
// 完整代码需实现：用户会话管理、权限验证、R2文件操作、D1数据操作等

// 样式（嵌入到HTML响应中）
const globalStyles = `
  /* 基础样式 */
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: sans-serif; line-height: 1.6; padding: 20px; max-width: 1200px; margin: 0 auto; }
  .container { width: 100%; }
  .navbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 10px; border-bottom: 1px solid #ddd; }
  .main-content { display: grid; grid-template-columns: 1fr; gap: 20px; }
  @media (min-width: 768px) {
    .main-content { grid-template-columns: 1fr 1fr; }
  }
  .text-area textarea { width: 100%; height: 100px; padding: 10px; margin-bottom: 10px; }
  .upload-area { border: 2px dashed #ddd; padding: 20px; text-align: center; }
  .history { grid-column: 1 / -1; }
  .text-item, .file-item { padding: 10px; margin: 10px 0; border: 1px solid #eee; border-radius: 4px; }
  button { padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
  button:hover { background: #0056b3; }
`;
