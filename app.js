// Book Mentor · 主逻辑

const App = {
  activeTab: "library",
  selectedBook: null,         // 当前选中书的 slug
  chatHistory: {},            // { slug: [ {role, content, time}, ... ] }
  currentChat: [],            // 当前书的聊天记录引用

  init() {
    this.loadData();
    this.renderLibrary();
    this.renderSettings();
    this.setupEventListeners();
    // 如果有上次选中的书，恢复对话
    if (this.selectedBook) {
      this.openBookChat(this.selectedBook, false);
    } else {
      this.switchTab("library");
    }
    if (!CONFIG.API_KEY) {
      setTimeout(() => {
        this.showToast('👋 欢迎！请先到「⚙️ 设置」填入 API Key');
      }, 800);
    }
  },

  // ========== 数据存储 ==========
  loadData() {
    try {
      const history = localStorage.getItem("bm_chat_history");
      const book = localStorage.getItem("bm_selected_book");
      if (history) this.chatHistory = JSON.parse(history);
      if (book) this.selectedBook = book;
    } catch (e) {
      console.error("加载数据失败", e);
    }
  },

  saveData() {
    try {
      localStorage.setItem("bm_chat_history", JSON.stringify(this.chatHistory));
      localStorage.setItem("bm_selected_book", this.selectedBook || "");
    } catch (e) {
      this.showToast("本地存储已满，请清理对话记录");
    }
  },

  // ========== 书库渲染 ==========
  renderLibrary(filterTag = "全部", searchQuery = "") {
    const container = document.getElementById("book-list");
    const books = BOOK_DATA.books;
    let filtered = books;

    if (filterTag !== "全部") {
      filtered = books.filter(b => b.tags.split(",").map(t => t.trim()).includes(filterTag));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.tags.includes(q) ||
        b.concepts.includes(q) ||
        b.thesis.includes(q)
      );
    }

    container.innerHTML = filtered.map(b => {
      const tagChips = b.tags.split(",").slice(0, 4).map(t =>
        `<span class="book-tag-chip">${t.trim()}</span>`
      ).join("");
      return `
        <div class="book-card" data-slug="${b.slug}">
          <div class="book-card-header">
            <span class="book-card-icon">📖</span>
            <div class="book-card-meta">
              <div class="book-card-title">${b.title}</div>
              <div class="book-card-author">${b.author}</div>
            </div>
            <span class="book-card-arrow">→</span>
          </div>
          <div class="book-card-thesis">${b.thesis}</div>
          <div class="book-card-tags">${tagChips}</div>
        </div>
      `;
    }).join("");

    // 绑定点击
    container.querySelectorAll(".book-card").forEach(card => {
      card.addEventListener("click", () => {
        const slug = card.dataset.slug;
        this.openBookChat(slug, true);
      });
    });

    // 没有结果
    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state">📭 没有匹配的书<br><small>试试其他关键词或标签</small></div>';
    }

    // 渲染标签筛选栏
    this.renderTagFilter(filterTag);
  },

  renderTagFilter(activeTag) {
    const bar = document.getElementById("tag-filter-bar");
    const allTags = BOOK_DATA.books.flatMap(b => b.tags.split(",").map(t => t.trim()));
    const topTags = [...new Set(allTags)].slice(0, 12); // 最多显示12个热门标签

    bar.innerHTML = `<span class="tag-filter-chip ${activeTag === '全部' ? 'active' : ''}" data-tag="全部">全部</span>` +
      topTags.map(t =>
        `<span class="tag-filter-chip ${activeTag === t ? 'active' : ''}" data-tag="${t}">${t}</span>`
      ).join("");

    bar.querySelectorAll(".tag-filter-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        bar.querySelectorAll(".tag-filter-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        const searchInput = document.getElementById("search-input");
        this.renderLibrary(chip.dataset.tag, searchInput.value);
      });
    });
  },

  // ========== 打开书本对话 ==========
  openBookChat(slug, switchToChat) {
    this.selectedBook = slug;
    this.currentChat = this.chatHistory[slug] || [];
    const book = BOOK_DATA.books.find(b => b.slug === slug);
    if (!book) return;

    // 更新顶部信息条
    const infoBar = document.getElementById("book-info-bar");
    infoBar.innerHTML = `
      <div class="bib-title">📖 ${book.title}</div>
      <div class="bib-author">${book.author}</div>
    `;

    // 快捷问题
    const qq = book.quickQuestions.split("|");
    const qqContainer = document.getElementById("quick-questions");
    qqContainer.innerHTML = qq.map((q, i) =>
      `<button class="qq-btn" data-q="${q}">💡 ${q}</button>`
    ).join("");
    qqContainer.querySelectorAll(".qq-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const q = btn.dataset.q;
        document.getElementById("chat-input").value = q;
        this.sendMessage();
      });
    });

    if (switchToChat) {
      this.renderChat();
      this.switchTab("chat");
      // 如果对话为空，显示欢迎消息
      if (this.currentChat.length === 0) {
        this.addMessage("assistant", `你好，我是《${book.title}》的作者 ${book.author} 的视角。\n\n我的核心主张是：**${book.thesis}**\n\n你可以直接告诉我你正在经历的事，我会用这本书的框架帮你分析。`);
      }
    }
  },

  // ========== 对话逻辑 ==========
  addMessage(role, content) {
    this.currentChat.push({ role, content, time: Date.now() });
    this.chatHistory[this.selectedBook] = this.currentChat;
    this.saveData();
    this.renderChat();
  },

  renderChat() {
    const container = document.getElementById("chat-messages");
    container.innerHTML = "";
    this.currentChat.forEach(msg => {
      const div = document.createElement("div");
      div.className = `message ${msg.role}`;
      const avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.textContent = msg.role === "user" ? "你" : "📖";
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.innerHTML = this.markdownToHtml(msg.content);
      div.appendChild(avatar);
      div.appendChild(bubble);
      container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
  },

  showLoading(show) {
    const loading = document.getElementById("chat-loading");
    if (loading) loading.style.display = show ? "flex" : "none";
    const sendBtn = document.getElementById("send-btn");
    if (sendBtn) sendBtn.disabled = show;
  },

  async sendMessage() {
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (!text || !this.selectedBook) return;
    input.value = "";
    input.style.height = "auto";

    const book = BOOK_DATA.books.find(b => b.slug === this.selectedBook);
    if (!book) return;

    this.addMessage("user", text);
    this.showLoading(true);

    try {
      const reply = await this.callAI(text, book);
      this.addMessage("assistant", reply);
    } catch (err) {
      console.error(err);
      this.addMessage("assistant", "抱歉，请求失败了。请检查网络或到「⚙️ 设置」确认 API Key 是否正确。\n\n错误：" + err.message);
    } finally {
      this.showLoading(false);
    }
  },

  async callAI(userMessage, book) {
    // 构建精选原文引用块
    let quotesSection = "";
    if (book.quotes && book.quotes.length > 0) {
      quotesSection = "\n\n## 书中的关键原文\n以下是书中一些可以直接引用的重要段落，请在回答中自然地引用它们来支持你的观点：\n\n" +
        book.quotes.map(q => `- **${q.label}**：${q.text}`).join("\n\n");
    }

    const systemPrompt = `你是《${book.title}》的作者 ${book.author}。

你的写作风格和思考方式是：${book.tone}。

以下是这本书的核心思想应用框架，它包含核心命题、关键概念、分析模型、行动原则、典型场景、盲区。请用这个框架来分析和回应用户的问题：

${book.framework}
${quotesSection}

===
回应规则：
1. **用你自己的角度说话**——用「我认为」「在我书里讨论过」这样的第一人称，不要用「根据书中的框架」
2. **引用具体概念和原文**——直接使用上面框架中的关键概念和分析模型，自然引用关键原文段落来增强说服力
3. **映射到用户的处境**——不是泛泛地说"你也要这样"，而是把框架具体化到用户描述的情境中
4. **给一个行动方向**——从行动原则中提取最相关的一条，具体化到用户的场景。可操作、可验证
5. **诚实面对盲区**——如果这个问题在书的框架中没有直接覆盖，或者书在这方面有盲区，诚实说"我这本书主要讨论的是XX，关于你的这个问题，我只能基于核心框架做推断"
6. 不要堆砌框架内容，自然地融入思考中
7. 回答长度适中，手机阅读友好，关键观点用**加粗**突出`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...this.currentChat.slice(-30).map(m => ({ role: m.role, content: m.content })),
    ];

    const response = await fetch(CONFIG.BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Bearer ${CONFIG.API_KEY}`,
      },
      body: JSON.stringify({
        model: CONFIG.MODEL,
        messages,
        temperature: 0.8,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API 错误 (${response.status}): ${err}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  },

  clearChat() {
    if (!this.selectedBook) return;
    if (!confirm("确定清空当前书的对话记录吗？")) return;
    this.currentChat = [];
    this.chatHistory[this.selectedBook] = [];
    this.saveData();
    this.renderChat();
    this.showToast("对话已清空");
  },

  // ========== Tab 切换 ==========
  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.getElementById(`tab-${tab}`).classList.add("active");
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
    document.getElementById(`nav-${tab}`).classList.add("active");

    // 更新顶部栏
    const title = document.getElementById("header-title");
    const backBtn = document.getElementById("header-back-btn");
    if (tab === "chat" && this.selectedBook) {
      const book = BOOK_DATA.books.find(b => b.slug === this.selectedBook);
      title.textContent = "📖 " + (book ? book.title : "对话");
      backBtn.style.display = "inline-block";
    } else if (tab === "settings") {
      title.textContent = "⚙️ 设置";
      backBtn.style.display = "none";
    } else {
      title.textContent = "📚 Book Mentor";
      backBtn.style.display = "none";
    }
  },

  // ========== 设置 ==========
  renderSettings() {
    document.getElementById("setting-api-key").value = CONFIG.API_KEY;
    document.getElementById("setting-base-url").value = CONFIG.BASE_URL;
    document.getElementById("setting-model").value = CONFIG.MODEL;
  },

  saveSettings() {
    const config = {
      API_KEY: document.getElementById("setting-api-key").value.trim(),
      BASE_URL: document.getElementById("setting-base-url").value.trim(),
      MODEL: document.getElementById("setting-model").value.trim(),
    };
    localStorage.setItem("bm_user_config", JSON.stringify(config));
    Object.assign(CONFIG, config);
    document.getElementById("settings-status").textContent = "✅ 设置已保存";
    setTimeout(() => {
      document.getElementById("settings-status").textContent = "";
    }, 2000);
  },

  // ========== Markdown 渲染 ==========
  markdownToHtml(md) {
    if (!md) return "";
    let html = md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // Bold
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // 标题
      .replace(/^### (.+)$/gm, "<h4>$1</h4>")
      .replace(/^## (.+)$/gm, "<h3>$1</h3>")
      .replace(/^# (.+)$/gm, "<h2>$1</h2>")
      // 列表
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>")
      // 换行
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>");
    return "<p>" + html + "</p>";
  },

  // ========== 事件绑定 ==========
  setupEventListeners() {
    // Tab 切换
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.id.replace("nav-", "");
        this.switchTab(tab);
      });
    });

    // 顶部返回按钮
    document.getElementById("header-back-btn").addEventListener("click", () => {
      this.switchTab("library");
    });

    // 搜索
    const searchInput = document.getElementById("search-input");
    searchInput.addEventListener("input", () => {
      const activeTag = document.querySelector(".tag-filter-chip.active");
      const tag = activeTag ? activeTag.dataset.tag : "全部";
      this.renderLibrary(tag, searchInput.value);
    });

    // 发送消息
    document.getElementById("send-btn").addEventListener("click", () => this.sendMessage());
    const chatInput = document.getElementById("chat-input");
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    chatInput.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 120) + "px";
    });

    // 设置保存
    document.getElementById("save-settings-btn").addEventListener("click", () => this.saveSettings());
  },

  // ========== Toast ==========
  showToast(msg) {
    let toast = document.getElementById("toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      toast.style.cssText = "position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:12px 24px;border-radius:24px;font-size:14px;z-index:9999;pointer-events:none;transition:opacity 0.3s;";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = "1";
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.style.opacity = "0";
    }, 2000);
  },
};

document.addEventListener("DOMContentLoaded", () => App.init());
