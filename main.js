const storyList = document.getElementById("storyList");
const storyForm = document.getElementById("storyForm");
const storyDetail = document.getElementById("storyDetail");
const tagFilter = document.getElementById("tagFilter");
const secretToggle = document.getElementById("secretToggle");

let stories = []; // ← ここが主役
let editingStoryId = null;
let currentFilter = null;
let showSecret = false;
let sortOrder = "desc";
let currentView = "list";
let lastScrollY = 0;
let visibleStories = [];

// --- 初期ロード ---
window.addEventListener("DOMContentLoaded", () => {
  fetch("stories.json")
    .then(res => res.json())
    .then(data => {
      stories = data;
      renderStories();
    })
    .catch(err => {
      console.error("読み込み失敗:", err);
      stories = [];
      renderStories();
    });
});

// --- 新規・編集 ---
document.getElementById("newStoryBtn").addEventListener("click", () => {
  storyForm.classList.remove("hidden");
  storyDetail.classList.add("hidden");
  storyList.classList.add("hidden");
  editingStoryId = null;
  document.getElementById("titleInput").value = "";
  document.getElementById("contentInput").value = "";
  document.getElementById("tagsInput").value = "";
});

document.getElementById("cancelBtn").addEventListener("click", () => {
  storyForm.classList.add("hidden");
  storyList.classList.remove("hidden");
});

document.getElementById("saveBtn").addEventListener("click", () => {
  const title = document.getElementById("titleInput").value.trim();
  const content = document.getElementById("contentInput").value.trim();
  const tags1 = document.getElementById("tagsInput1").value;
  const tags2 = document.getElementById("tagsInput2").value;
  const tags3 = document.getElementById("tagsInput3").value;

  // 2つのタグ欄の内容を結合して、配列化・空要素除去
  const tags = [...tags1.split(/[,\s]+/), ...tags2.split(/[,\s]+/), ...tags3.split(/[,\s]+/)]
    .map(t => t.trim())
    .filter(Boolean);

  if (!title || !content) return alert("タイトルと本文は必須です");

  if (editingStoryId) {
    const index = stories.findIndex(s => s.id === editingStoryId);
    if (index !== -1) {
      stories[index].title = title;
      stories[index].content = content;
      stories[index].tags = tags;
    }
  } else {
    stories.unshift({
      id: crypto.randomUUID(),
      title,
      content,
      tags,
      favorite: false,
      createdAt: new Date().toISOString()
    });
  }

  editingStoryId = null;
  storyForm.classList.add("hidden");
  storyList.classList.remove("hidden");
  renderStories(currentFilter);
});

// --- 描画関連 ---
function formatContent(content) {
  const match = content.match(/^CP:(.+)/);
  if (match) {
    return `<strong>${match[1].replace(/\n/g, "<br>")}</strong>`;
  }
  return content.replace(/\n/g, "<br>");
}

function renderStories(filterTag = null) {
  currentFilter = filterTag;
  let filtered = [...stories];

  if (showSecret) {
    filtered = filtered.filter(s => s.tags.includes("secret"));
  } else {
    filtered = filtered.filter(s => !s.tags.includes("secret"));
  }

  if (filterTag === "#favorites") {
    filtered = filtered.filter(s => s.favorite);
  } else if (filterTag && filterTag !== "#favorites") {
    filtered = filtered.filter(s => s.tags.includes(filterTag));
  }

  filtered.sort((a, b) => {
    const timeA = new Date(a.createdAt);
    const timeB = new Date(b.createdAt);
    return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
  });

  renderTagList(stories);

  visibleStories = filtered;

  const sortBtn = document.getElementById("sortToggleBtn");
  if (sortBtn) {
    sortBtn.innerHTML = sortOrder === "desc"
      ? '<i class="fa-solid fa-arrow-down"></i><span> 新順</span>'
      : '<i class="fa-solid fa-arrow-up"></i><span> 古順</span>';
  }

  storyList.innerHTML = "";

  filtered.forEach((story, index) => {
    const card = document.createElement("div");
    card.className = "story-card";

    const favIcon = story.favorite
      ? '<i class="fa-solid fa-star"></i>'
      : '<i class="fa-regular fa-star"></i>';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h3>${story.title}</h3>
        <span class="fav-icon ${story.favorite ? 'active' : ''}">${favIcon}</span>
      </div>
      <div>${story.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}</div>
    `;

    card.addEventListener("click", () => {
      lastScrollY = window.scrollY;
      showDetail(story, index);
    });

    storyList.appendChild(card);
  });
}

function renderTagList(storyData) {
  const allTags = new Set();
  storyData.forEach(story => story.tags.forEach(tag => allTags.add(tag)));

  tagFilter.innerHTML = `
    <button onclick="renderStories()" class="tag-button">すべて表示</button>
    <button onclick="renderStories('#favorites')" class="tag-button"><i class="fa-solid fa-star"></i> お気に入り</button>
  `;

  const cpTags = [...allTags].filter(tag => tag.startsWith("CP:")).sort();
  const normalTags = [...allTags].filter(tag => !tag.startsWith("CP:") && tag !== "secret").sort();

  if (cpTags.length > 0) {
    const cpGroup = document.createElement("div");
    cpGroup.innerHTML = `<div class="tag-group-title">CP</div>`;
    cpTags.forEach(tag => {
      const btn = document.createElement("button");
      const cpName = tag.replace(/^CP:/, "");
      btn.innerHTML = `<strong>#${cpName}</strong>`;
      btn.className = "tag-button";
      btn.onclick = () => renderStories(tag);
      cpGroup.appendChild(btn);
    });
    tagFilter.appendChild(cpGroup);
  }

  if (normalTags.length > 0) {
    const otherGroup = document.createElement("div");
    otherGroup.innerHTML = `<div class="tag-group-title">タグ</div>`;
    normalTags.forEach(tag => {
      const btn = document.createElement("button");
      btn.textContent = `#${tag}`;
      btn.className = "tag-button";
      btn.onclick = () => renderStories(tag);
      otherGroup.appendChild(btn);
    });
    tagFilter.appendChild(otherGroup);
  }
}

function showDetail(story) {
  const index = visibleStories.findIndex(s => s.id === story.id);

  storyList.classList.add("hidden");
  storyDetail.classList.remove("hidden");
  storyForm.classList.add("hidden");

  window.scrollTo({ top: 0, behavior: "smooth" });

  storyDetail.innerHTML = `
    <h2>${story.title}</h2>
    <p>${story.content.replace(/\n/g, "<br>")}</p>
    <div class="tags">${story.tags.map(tag => `<span class="tag">${tag}</span>`).join(" ")}</div>
    <div class="detail-buttons">
      ${index > 0 ? '<button id="prevStoryBtn"><i class="fa-solid fa-chevron-left"></i> 前へ</button>' : ''}
      <button id="closeDetailBtn"><i class="fa-solid fa-xmark"></i> 閉じる</button>
      ${index < stories.length - 1 ? '<button id="nextStoryBtn">次へ <i class="fa-solid fa-chevron-right"></i></button>' : ''}
    </div>
  `;

  document.getElementById("closeDetailBtn").addEventListener("click", () => {
    storyDetail.classList.add("hidden");
    storyList.classList.remove("hidden");

    window.scrollTo({ top: lastScrollY, behavior: "auto" });
  });

  if (index > 0) {
    document.getElementById("prevStoryBtn").addEventListener("click", () => {
      showDetail(visibleStories[index - 1]);
    });
  }

if (index < stories.length - 1) {
  document.getElementById("nextStoryBtn").addEventListener("click", () => {
    storyDetail.classList.add("hidden");
    setTimeout(() => {
      showDetail(visibleStories[index + 1]);
    }, 0);
  });
}
}

function backToList() {
  storyDetail.classList.add("hidden");
  storyList.classList.remove("hidden");
  if (currentView === "list") {
    renderStories(currentFilter);
  } else {
    renderTimelineView(currentFilter);
  }
  window.scrollTo(0, lastScrollY); // ← スクロール位置を元に戻す
}

function toggleFavorite(id) {
  const idx = stories.findIndex(s => s.id === id);
  if (idx !== -1) {
    stories[idx].favorite = !stories[idx].favorite;
    showDetail(stories[idx]);
  }
}

function deleteStory(id) {
  if (!confirm("このストーリーを削除しますか？")) return;
  stories = stories.filter(story => story.id !== id);
  backToList();
}

function editStory(id) {
  const story = stories.find(s => s.id === id);
  if (!story) return;

  editingStoryId = story.id;
  document.getElementById("titleInput").value = story.title;
  document.getElementById("contentInput").value = story.content;
  document.getElementById("tagsInput").value = story.tags.join(", ");

  storyDetail.classList.add("hidden");
  storyForm.classList.remove("hidden");
}

// --- シークレット切替 ---
secretToggle.addEventListener("click", () => {
  showSecret = !showSecret;
  secretToggle.innerHTML = showSecret
    ? '<i class="fa-solid fa-book"></i>'
    : '<i class="fa-solid fa-book-open"></i>';
  if (currentView === "list") {
    renderStories(currentFilter);
  } else {
    renderTimelineView(currentFilter);
  }
});

// --- ソート切替 ---
function toggleSortOrder() {
  sortOrder = (sortOrder === "desc") ? "asc" : "desc";
  if (currentView === "list") {
    renderStories(currentFilter);
  } else {
    renderTimelineView(currentFilter);
  }
}

// --- 年表表示 ---
function renderTimelineView(filterTag = null) {
  visibleStories = [];
  const grouped = {};

  stories.forEach((story, index) => {
    if (showSecret && !story.tags.includes("secret")) return;
    if (!showSecret && story.tags.includes("secret")) return;
    if (filterTag && filterTag !== "#favorites" && !story.tags.includes(filterTag)) return;
    if (filterTag === "#favorites" && !story.favorite) return;

    const dateKey = new Date(story.createdAt).toISOString().slice(0, 10);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push({ story, index }); // ← indexも一緒に保存
  });

  const sortedDates = Object.keys(grouped).sort((a, b) => {
    return sortOrder === "desc" ? b.localeCompare(a) : a.localeCompare(b);
  });

  storyList.innerHTML = "";
  storyList.classList.remove("hidden");
  storyDetail.classList.add("hidden");
  storyForm.classList.add("hidden");

  sortedDates.forEach(date => {
    const section = document.createElement("section");
    section.innerHTML = `<h2 style="margin-top: 2rem;"><i class="fa-solid fa-calendar-days"></i> ${date}</h2>`;

    grouped[date].sort((a, b) => {
      const timeA = new Date(a.story.createdAt);
      const timeB = new Date(b.story.createdAt);
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });

    grouped[date].forEach(({ story, index }) => {

      const card = document.createElement("div");
      card.className = "story-card";

      const favIcon = story.favorite
        ? '<i class="fa-solid fa-star"></i>'
        : '<i class="fa-regular fa-star"></i>';

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3>${story.title}</h3>
          <span class="fav-icon ${story.favorite ? 'active' : ''}">${favIcon}</span>
        </div>
        <div>${story.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}</div>
      `;

      card.addEventListener("click", () => {
        lastScrollY = window.scrollY;
        showDetail(story, visibleStories.length);
      });

      visibleStories.push(story);

      section.appendChild(card);
    });

    storyList.appendChild(section);
  });
}

// --- ビュー切替 ---
function toggleViewMode() {
  currentView = (currentView === "list") ? "timeline" : "list";
  const viewBtn = document.getElementById("viewModeBtn");
  viewBtn.innerHTML = currentView === "list"
    ? '<i class="fa-solid fa-calendar-days"></i><span> 年表モード</span>'
    : '<i class="fa-solid fa-list"></i><span> 通常モード</span>';

  if (currentView === "list") {
    renderStories(currentFilter);
  } else {
    renderTimelineView(currentFilter);
  }
}

// --- JSONエクスポート機能 ---
function exportJSON() {
  const blob = new Blob([JSON.stringify(stories, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "stories.json";
  a.click();
}
