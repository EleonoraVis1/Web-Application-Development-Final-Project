declare global {
    interface Window {
        logout: () => void;
        allRunners?: Runner[];
        quizResults?: string[];
        quizInfos?: string[];
        quizImages?: string[];
    }
}


export {};

interface Runner {
    id: number;
    name: string;
    description?: string;
    image?: string;
    votes?: number;
}

interface Story {
    id: number;
    author_username: string;
    content: string;
    reactions_count?: number;
    author?: { username?: string };
}


const popularStories: Story[] = []; //


interface MileageRecord {
    desired_mileage: number;
    start_mileage: number;
    jump: number;
    weeks: number;
    created_at: string;
}

interface Stats {
    total_runners: number;
    most_voted_runner?: string | null;
    top_votes?: number;
    total_memes?: number;
    average_desired_mileage?: number | null;
}

interface QuizRunnerData {
    results: string[];
    runners_info: string[];
    images: string[];
}

type HeadersObject = Record<string, string>;

window.logout = function (): void {
    localStorage.clear();
    window.location.href = "/api/login";
};

window.addEventListener("error", function (e: ErrorEvent) {
    console.error("Frontend error:", e.message);

    fetch("http://127.0.0.1:8000/api/log/frontend/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            message: e.message,
            filename: e.filename,
            line: e.lineno,
            column: e.colno
        })
    }).catch(err => {
        console.error("Failed to send frontend error:", err);
    });
});

document.addEventListener("DOMContentLoaded",  (): void => {
    const apiUrl = "http://localhost:8000/api";
const token = localStorage.getItem("access");
const isAdmin = localStorage.getItem("is_admin") === "true";

if (!token) {
    window.location.href = "/api/login/";
}

function authHeaders(json = true): HeadersObject {
    const headers: HeadersObject = {
        Authorization: token ? `Bearer ${token}` : ""
    };
    if (json) headers["Content-Type"] = "application/json";
    return headers;
}

// -------------------- SSE (votes) --------------------
const sse = new EventSource(`${apiUrl}/vote/stream/`);
sse.onmessage = (e: MessageEvent) => {
    try {
        const voteMap: Record<number, number> = JSON.parse(e.data);
        const runnerList = convertSSEToRunnerList(voteMap);
        loadResults(runnerList);
    } catch (err) {
        console.error("Invalid SSE data:", err);
    }
};

// -------------------- DOM helpers (typed) --------------------
const timelineContainer = document.querySelector<HTMLElement>('.timeline')!;
const searchBtn = document.getElementById("story-search-btn") as HTMLButtonElement | null;
const showAllBtn = document.getElementById("story-show-all-btn") as HTMLButtonElement | null;

const reviewsContainer = document.getElementById("reviews") as HTMLElement;
const crazyContainer = document.getElementById("crazy") as HTMLElement;
const reviewText = document.getElementById("review") as HTMLTextAreaElement;
const submitBtn = document.getElementById("submit") as HTMLButtonElement;

const mileageForm = document.getElementById("mileage-form") as HTMLFormElement;
const resultMileage = document.getElementById("mileage") as HTMLElement;
const btnMil = document.getElementById("mileage-button") as HTMLButtonElement;

const mileageTableBody = document.querySelector<HTMLTableSectionElement>("#mileage-table tbody")!;
const ageFilter = document.getElementById("age-filter") as HTMLInputElement;
const sortOrder = document.getElementById("sort-order") as HTMLInputElement;
const filterBtn = document.getElementById("filter-mileage") as HTMLButtonElement;

const galleryContainer = document.getElementById("gallery") as HTMLElement;
const btnContainer = document.getElementById("myBtnContainer") as HTMLElement;
const btns: HTMLCollectionOf<Element> | null =
    btnContainer ? btnContainer.getElementsByClassName("btn") : null;

const paginationContainer = document.getElementById("pagination") as HTMLElement;

const chooseRunnerBtn = document.getElementById('runner-button') as HTMLButtonElement | null;
const runnerList = document.getElementById("runners") as HTMLSelectElement | null;
const runnerMap = new Map<string, string>();

// star rating elements
const starRating = document.getElementById('starRating') as HTMLElement;
const starRatingValue = document.getElementById('starRatingValue') as HTMLElement;

// quiz elements
const questionEl = document.querySelector<HTMLElement>(".question")!;
const optionsEl = document.querySelector<HTMLElement>(".options")!;
const resultEl = document.querySelector<HTMLElement>(".result")!;
const scoreEl = document.getElementById("score") as HTMLElement;
const restartBtn = document.querySelector<HTMLElement>(".restart-btn")!;
const infoEl = document.querySelector<HTMLElement>(".runner-info")!;
const imageEl = document.getElementById("image") as HTMLImageElement;

// quiz2 elements
const questionEl2 = document.querySelector<HTMLElement>(".question2")!;
const optionsEl2 = document.querySelector<HTMLElement>(".options2")!;
const resultEl2 = document.querySelector<HTMLElement>(".result2")!;
const scoreEl2 = document.getElementById("score2") as HTMLElement;
const restartBtn2 = document.querySelector<HTMLElement>(".restart-btn2")!;

// results list element

loadQuizRunners().then((data: QuizRunnerData) => {
    window.quizResults = data.results;
    window.quizInfos = data.runners_info;
    window.quizImages = data.images;
});
// upload input elements - typed when used

// -------------------- State --------------------
let memes: { id: number | string; url: string; category?: string }[] = [];
let chosenValue = "all";
let currentPage = 1;
const memesPerPage = 10;

let quizData: { question: string; options: { text: string; id: number }[] }[] = [];
let selectedAnswers: number[] = [];

let quizData2: { question: string; options: { text: string; id: number }[] }[] = [];
let selectedAnswers2: number[] = [];

// -------------------- Functions --------------------

async function loadStats(): Promise<void> {
    try {
        const res = await fetch(`${apiUrl}/stats/`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as Stats;
        const container = document.getElementById("stats-container");
        if (!container) return;
        container.innerHTML = `
            <p><strong>Total runners submitted:</strong> ${data.total_runners}</p>
            <p><strong>Most voted runner:</strong> ${data.most_voted_runner || "None yet"}</p>
            <p><strong>Votes for top runner:</strong> ${data.top_votes ?? 0}</p>
            <p><strong>Total memes uploaded:</strong> ${data.total_memes ?? 0}</p>
            <p><strong>Average requested mileage:</strong> ${data.average_desired_mileage?.toFixed(1) || "N/A"} miles</p>
        `;
    } catch (err) {
        console.error("Stats fetch failed:", err);
    }
}

async function loadMemes(): Promise<void> {
    try {
        const res = await fetch("/api/memes/", { headers: { Authorization: `Bearer ${token}` } });
        if (res.status === 401) {
            localStorage.clear();
            window.location.href = "/api/login/";
            return;
        }
        // ignoring data for now as original did
        await res.json();
    } catch (err) {
        console.error("Error loading memes:", err);
    }
}

async function loadQuizRunners(): Promise<QuizRunnerData> {
    const response = await fetch(`${apiUrl}/runners/quiz/`, {
        method: "GET",
        headers: authHeaders()
    });
    const runners = await response.json();
    const results: string[] = runners.map((r: Runner) => r.name);
    const runners_info: string[] = runners.map((r: Runner) => r.description || "");
    const images: string[] = runners.map((r: Runner) => r.image || "");
    return { results, runners_info, images };
}

if (searchBtn) searchBtn.addEventListener("click", searchStories);
if (showAllBtn) showAllBtn.addEventListener("click", () => renderOrFetchStories(null));

// -------------------- Stories / Search --------------------
async function searchStories(): Promise<void> {
    const input = document.getElementById("story-search-input") as HTMLInputElement | null;
    const query = input?.value.trim() ?? "";
    const tokenLocal = localStorage.getItem("access");

    try {
        const res = await fetch(`${apiUrl}/stories/search/?q=` + encodeURIComponent(query), {
            headers: { Authorization: `Bearer ${tokenLocal}` }
        });
        const data = await res.json();
        const container = document.getElementById("reviews");
        if (!container) return;

        if (!Array.isArray(data.results) || data.results.length === 0) {
            container.innerHTML = "<p>No matching stories found.</p>";
            return;
        }

        renderOrFetchStories(data.results);
    } catch (err) {
        console.error("Search error:", err);
    }
}

// -------------------- Timeline references --------------------
async function loadTimelineReferences(): Promise<void> {
    try {
        const eventsRes = await fetch(`${apiUrl}/timeline/`, { headers: authHeaders() });
        const events = await eventsRes.json();
        const container = document.getElementById("timelineReferences");
        if (!container) return;
        container.innerHTML = "";

        for (const event of events) {
            const refRes = await fetch(`${apiUrl}/events/${event.id}/references/`, { headers: authHeaders() });
            const references = await refRes.json();

            const eventBlock = document.createElement("div");
            eventBlock.className = "row2";
            eventBlock.innerHTML = `
                <h3>${event.year}</h3>
                <p>${event.description}</p>
            `;
            container.appendChild(eventBlock);

            references.forEach((ref: { question: string; answer: string }) => {
                const qaBlock = document.createElement("div");
                qaBlock.className = "row";
                qaBlock.innerHTML = `
                    <p>${ref.question}</p>
                    <button class="answer"><span>${ref.answer}</span></button>
                `;
                container.appendChild(qaBlock);
            });
        }
    } catch (error) {
        console.error("Error loading timeline data:", error);
    }
}

// -------------------- SSE conversion & results rendering --------------------
function convertSSEToRunnerList(sseData: Record<number, number>): { name: string; votes: number }[] {
    const runners = window.allRunners || [];
    return runners.map(r => ({
        name: r.name,
        votes: sseData[r.id] ?? 0
    }));
}

async function loadResults(runners: { name: string; votes: number }[]): Promise<void> {
    const resultsDiv = document.getElementById("results-list");
    if (!resultsDiv) return;
    resultsDiv.innerHTML = "";

    runners.forEach(runner => {
        const item = document.createElement("div");
        item.classList.add("result-item");
        item.innerHTML = `
            <span class="result-name">${runner.name}:</span>
            <span class="result-votes">${runner.votes}</span>
        `;
        resultsDiv.appendChild(item);
    });
}

// -------------------- Poll submit --------------------
const pollForm = document.getElementById("poll-form") as HTMLFormElement | null;
if (pollForm) {
    pollForm.addEventListener("submit", async (e: Event) => {
        e.preventDefault();
        const selected = document.querySelector<HTMLInputElement>('input[name="vote"]:checked');
        const message = document.getElementById("vote-message") as HTMLElement | null;

        if (!selected) {
            if (message) message.textContent = "Please select a runner!";
            return;
        }

        const runnerId = selected.value;

        const response = await fetch(`${apiUrl}/vote/`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ runner: runnerId })
        });

        if (response.status === 400) {
            if (message) message.textContent = "You have already voted!";
            return;
        }

        if (response.ok) {
            if (message) message.textContent = "Thank you for voting!";
        } else {
            if (message) message.textContent = "Error submitting vote.";
        }
    });
}

// -------------------- Load timeline --------------------
async function loadTimeline(): Promise<void> {
    try {
        const res = await fetch(`${apiUrl}/timeline/`, { headers: authHeaders() });
        const events = await res.json();
        if (!timelineContainer) return;
        timelineContainer.innerHTML = "";

        events.forEach((event: any, index: number) => {
            const containerDiv = document.createElement("div");
            containerDiv.classList.add("container");
            containerDiv.classList.add(index % 2 === 0 ? "left" : "right");
            containerDiv.innerHTML = `
                <div class="content">
                    <h2>${event.year}</h2>
                    <p>${event.description}</p>
                </div>
            `;
            timelineContainer.appendChild(containerDiv);
        });
    } catch (err) {
        console.error("Failed to load timeline:", err);
    }
}

// -------------------- Runners loading --------------------
async function loadRunners(): Promise<void> {
    try {
        const response = await fetch(`${apiUrl}/runners/`, { headers: authHeaders() });
        const runners: Runner[] = await response.json();

        const container = document.getElementById("runner-options");
        if (container) container.innerHTML = "";
        if (runnerList) runnerList.innerHTML = "";

        runners.forEach(runner => {
            runnerMap.set(runner.name, runner.description || "");
            const option = document.createElement("option");
            option.textContent = runner.name;
            if (runnerList) runnerList.appendChild(option);

            const label = document.createElement("label");
            label.innerHTML = `
                <input type="radio" name="vote" value="${runner.id}">
                ${runner.name}
            `;
            if (container) container.appendChild(label);
        });
    } catch (err) {
        console.error("Failed to load runners:", err);
    }
}

if (chooseRunnerBtn) {
    chooseRunnerBtn.addEventListener("click", function () {
        const selectedRunner = runnerList?.value || "";
        const bio = runnerMap.get(selectedRunner) || "No description available.";
        const resultBioEl = document.getElementById("result-bio");
        if (resultBioEl) resultBioEl.innerHTML = `<h4>${selectedRunner}</h4><br>${bio}`;
    });
}

// -------------------- Add runner form --------------------
const addRunnerForm = document.getElementById("add-runner-form") as HTMLFormElement | null;
if (addRunnerForm) {
    addRunnerForm.addEventListener("submit", async (e: Event) => {
        e.preventDefault();

        const name = (document.getElementById("runner-name") as HTMLInputElement).value.trim();
        const description = (document.getElementById("runner-description") as HTMLInputElement).value.trim();
        const imageElInput = document.getElementById("runner-image") as HTMLInputElement | null;
        const imageFile = imageElInput?.files?.[0];

        const message = document.getElementById("runner-message") as HTMLElement | null;
        if (message) {
            message.textContent = "";
            (message.style as CSSStyleDeclaration).color = "red";
        }

        if (!name) {
            if (message) message.textContent = "Runner name cannot be empty.";
            return;
        }
        if (!description) {
            if (message) message.textContent = "Description cannot be empty.";
            return;
        }

        if (imageFile) {
            if (!imageFile.type.startsWith("image/")) {
                if (message) message.textContent = "The selected file must be an image.";
                return;
            }
            if (imageFile.size > 5 * 1024 * 1024) {
                if (message) message.textContent = "Image size must be under 5MB.";
                return;
            }
        }

        const formData = new FormData();
        formData.append("name", name);
        formData.append("description", description);
        if (imageFile) formData.append("image", imageFile);

        try {
            const response = await fetch(`${apiUrl}/runners/create/`, {
                method: "POST",
                headers: {
                    Authorization: authHeaders().Authorization
                } as HeadersObject,
                body: formData
            });

            if (!response.ok) {
                let errorMsg = "Error creating runner.";
                try {
                    const backendError = await response.json();
                    if (backendError.name) errorMsg = backendError.name[0];
                    if (backendError.description) errorMsg = backendError.description[0];
                    if (backendError.image) errorMsg = backendError.image[0];
                } catch { /* ignore parse errors */ }
                if (message) message.textContent = errorMsg;
                return;
            }

            if (message) {
                (message.style as CSSStyleDeclaration).color = "green";
                message.textContent = "Runner created successfully!";
            }

            await loadRunners();
            await loadOnce();

            (e.target as HTMLFormElement).reset();
        } catch (err) {
            console.error("Error creating runner:", err);
            if (message) message.textContent = "Error creating runner.";
        }
    });
}

// -------------------- Mileage form --------------------
if (btnMil) {
    btnMil.addEventListener("click", async function () {
        if (!mileageForm) return;
        const data = new FormData(mileageForm);
        const age = data.get("age");
        const injury = data.get("injury");
        const desiredMileageRaw = String(data.get("desiredMileage") ?? "").trim();
        const desiredMileage = parseInt(desiredMileageRaw, 10);

        if (!age || !injury || isNaN(desiredMileage)) {
            alert("Please answer all questions and enter a valid mileage.");
            return;
        }

        try {
            const res = await fetch("http://127.0.0.1:8000/api/mileage/", {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({ age, injury, desiredMileage })
            });

            const resData = await res.json();

            if (!res.ok) {
                alert("Error: " + Object.values(resData).flat().join(", "));
                console.error("Backend error:", resData);
                return;
            }

            const historyRes = await fetch(`${apiUrl}/mileage/history/`, { headers: { Authorization: `Bearer ${token}` } });
            const historyData = await historyRes.json();
            renderMileageTable(historyData);

            const latest = resData.latest;
            if (resultMileage && latest) {
                resultMileage.innerHTML = `
                    <p>You will reach your desired ${latest.desired_mileage} miles in approximately 
                    ${latest.weeks} weeks. To reduce the risk of injury, you will start at 
                    ${latest.start_mileage} miles per week and increase by ${latest.jump} miles each week.</p>`;
            }
        } catch (err) {
            console.error("Network error:", err);
        }

        mileageForm.reset();
    });
}

// initial load for mileage history on window load
window.addEventListener("load", async function () {
    try {
        const res = await fetch(`${apiUrl}/mileage/history/`, { headers: { Authorization: `Bearer ${token}` } });
        const data: MileageRecord[] = await res.json();
        if (!data.length) return;

        const latest = data[0];
        renderMileageTable(data);

        if (resultMileage) {
            resultMileage.innerHTML = `
                <p>You will reach your desired ${latest.desired_mileage} miles in approximately 
                ${latest.weeks} weeks. To reduce the risk of injury, you will start at 
                ${latest.start_mileage} miles per week and increase by ${latest.jump} miles each week.</p>`;
        }
    } catch (err) {
        console.error("Error loading mileage history:", err);
    }
});

// -------------------- Mileage table --------------------
async function fetchMileageHistory(): Promise<void> {
    try {
        const tokenLocal = localStorage.getItem("access");
        const params = new URLSearchParams();
        if (ageFilter?.value) params.append("age", ageFilter.value);
        if (sortOrder?.value) params.append("sort", sortOrder.value);

        const res = await fetch(`${apiUrl}/mileage/history/?${params.toString()}`, {
            headers: { Authorization: `Bearer ${tokenLocal}` }
        });

        const data = await res.json();
        renderMileageTable(data);
    } catch (err) {
        console.error("Failed to fetch mileage history:", err);
    }
}

function renderMileageTable(records: MileageRecord[]): void {
    if (!mileageTableBody) return;
    mileageTableBody.innerHTML = "";

    if (!Array.isArray(records) || records.length === 0) {
        mileageTableBody.innerHTML = `<tr><td colspan="5">No mileage plans found.</td></tr>`;
        return;
    }

    records.forEach(rec => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${rec.desired_mileage}</td>
            <td>${rec.start_mileage}</td>
            <td>${rec.jump}</td>
            <td>${rec.weeks}</td>
            <td>${new Date(rec.created_at).toLocaleString()}</td>
        `;
        mileageTableBody.appendChild(row);
    });
}

if (filterBtn) filterBtn.addEventListener("click", fetchMileageHistory);

// -------------------- Stories creation / reactions / delete --------------------
if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
        const content = reviewText?.value.trim() ?? "";
        if (!content) {
            alert("Please enter some content for your story.");
            return;
        }

        try {
            const res = await fetch(`${apiUrl}/stories/`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({ content }),
            });

            if (!res.ok) {
                const data = await res.json();
                alert(data.detail || "Failed to create story.");
                return;
            }

            const newStory = await res.json() as Story;
            const reviewEl = document.createElement("div");
            reviewEl.classList.add("review");
            reviewEl.innerHTML = `
                <h4>${newStory.author_username ?? ""}</h4>
                <p>${newStory.content ?? ""}</p>
                <button class="reaction-button">Cool ${newStory.reactions_count ?? 0}</button>
            `;

            const reactionBtn = reviewEl.querySelector<HTMLButtonElement>(".reaction-button")!;
            reactionBtn.addEventListener("click", async () => {
                await reactToStory(newStory.id, reactionBtn, newStory);
            });

            if (isAdmin) {
                const deleteBtn = document.createElement("button");
                deleteBtn.textContent = "Delete";
                deleteBtn.classList.add("delete-btn");

                deleteBtn.addEventListener("click", async () => {
                    if (!confirm("Are you sure you want to delete this story?")) return;
                    try {
                        await deleteStory(newStory.id);
                        reviewEl.remove();
                        updateMostReacted();
                    } catch (err) {
                        console.error("Error deleting story:", err);
                        alert("Failed to delete story.");
                    }
                });

                reviewEl.appendChild(deleteBtn);
            }

            if (reviewsContainer) reviewsContainer.prepend(reviewEl);
            if (reviewText) reviewText.value = "";
            updateMostReacted();
        } catch (err) {
            console.error("Error creating story:", err);
        }
    });
}

async function renderOrFetchStories(providedStories: Story[] | null): Promise<void> {
    const tokenLocal = localStorage.getItem("access");
    function renderStoriesArray(stories: Story[]) {
        if (!reviewsContainer || !crazyContainer) return;
        reviewsContainer.innerHTML = "";
        let maxReactions = -1;
        let popularStory: Story = popularStories[0];

        if (!Array.isArray(stories) || stories.length === 0) {
            reviewsContainer.innerHTML = "<p>No stories found.</p>";
            crazyContainer.textContent = "";
            return;
        }

        stories.forEach(story => {
            const reviewEl = document.createElement("div");
            reviewEl.classList.add("review");

            const author = story.author_username || (story.author && story.author.username) || "Unknown";
            const content = story.content || "";
            const reactionsCount = Number(story.reactions_count) || 0;

            reviewEl.innerHTML = `
                <h4>${author}</h4>
                <p>${content}</p>
                <button class="reaction-button">Cool ${reactionsCount}</button>
            `;

            const reactionBtn = reviewEl.querySelector<HTMLButtonElement>(".reaction-button")!;
            reactionBtn.addEventListener("click", async () => {
                try {
                    await reactToStory(story.id, reactionBtn, story);
                } catch (err) {
                    console.error("Error reacting to story:", err);
                }
            });

            if (isAdmin) {
                const deleteBtn = document.createElement("button");
                deleteBtn.textContent = "Delete";
                deleteBtn.classList.add("delete-btn");

                deleteBtn.addEventListener("click", async () => {
                    if (!confirm("Are you sure you want to delete this story?")) return;
                    try {
                        await deleteStory(story.id);
                        reviewEl.remove();
                        updateMostReacted();
                    } catch (err) {
                        console.error("Error deleting story:", err);
                        alert("Failed to delete story.");
                    }
                });

                reviewEl.appendChild(deleteBtn);
            }

            reviewsContainer.appendChild(reviewEl);

            if (reactionsCount > maxReactions) {
                maxReactions = reactionsCount;
                popularStory = story;
            }
        });

        if (popularStory) {
            
            crazyContainer.textContent = `${popularStory?.author_username ?? ""}\n\n${popularStory?.content ?? ""}`;

        } else {
            crazyContainer.textContent = "";
        }
    }

    if (Array.isArray(providedStories) && providedStories.length > 0) {
        renderStoriesArray(providedStories);
        return;
    }

    try {
        const res = await fetch(`${apiUrl}/stories/`, {
            headers: { Authorization: `Bearer ${tokenLocal}` }
        });

        if (!res.ok) {
            console.error("Failed to fetch stories:", res.status, res.statusText);
            if (reviewsContainer) reviewsContainer.innerHTML = "<p>Error loading stories.</p>";
            if (crazyContainer) crazyContainer.textContent = "";
            return;
        }

        const data = await res.json();
        const stories = Array.isArray(data) ? data as Story[] : (data.results || []) as Story[];
        renderStoriesArray(stories);
    } catch (err) {
        console.error("Error fetching stories:", err);
        if (reviewsContainer) reviewsContainer.innerHTML = "<p>Error loading stories.</p>";
        if (crazyContainer) crazyContainer.textContent = "";
    }
}

// -------------------- Most reacted UI helper --------------------
function updateMostReacted(): void {
    if (!reviewsContainer || !crazyContainer) return;
    //const reviewEls = Array.from(reviewsContainer.querySelectorAll<HTMLElement>(".review"));
    const reviewEls: HTMLElement[] = Array.from(
    reviewsContainer.querySelectorAll<HTMLElement>(".review")
);

    let maxCount = -1;
    let popularEl: HTMLElement = reviewEls[0];

    reviewEls.forEach(el => {
        const btn = el.querySelector<HTMLButtonElement>(".reaction-button");
        const countText = btn?.textContent?.replace("Cool ", "") ?? "0";
        const count = parseInt(countText, 10) || 0;
        if (count > maxCount) {
            maxCount = count;
            popularEl = el;
        }
    });

    if (popularEl) {
        const author = popularEl.querySelector("h4")?.textContent || "";
        const content = popularEl.querySelector("p")?.textContent || "";
        crazyContainer.textContent = `${author}\n\n${content}`;
    } else {
        crazyContainer.textContent = "";
    }
}

async function deleteStory(id: number | string): Promise<void> {
    try {
        await fetch(`${apiUrl}/stories/${id}/delete/`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });
    } catch (err) {
        console.error("Error deleting story:", err);
    }
}

async function reactToStory(storyId: number | string, buttonEl: HTMLButtonElement, story: Partial<Story>): Promise<void> {
    try {
        const res = await fetch(`${apiUrl}/stories/${storyId}/react/`, {
            method: "POST",
            headers: authHeaders(),
        });

        if (res.status === 400) {
            const data = await res.json();
            alert(data.detail || "You already reacted to this story.");
            return;
        }

        const currentCountText = buttonEl.textContent?.replace("Cool ", "") ?? "0";
        let currentCount = parseInt(currentCountText, 10) || 0;
        currentCount++;
        buttonEl.textContent = `Cool ${currentCount}`;
        (story as any).reactions_count = currentCount;

        updateMostReacted();
    } catch (err) {
        console.error("Error reacting to story:", err);
    }
}

// -------------------- Meme gallery --------------------
function loadMemesFromBackend(): void {
    const tokenLocal = localStorage.getItem("access");
    if (!tokenLocal) {
        window.location.href = "/api/login/";
        return;
    }

    fetch("http://127.0.0.1:8000/api/memes/", { headers: { Authorization: `Bearer ${tokenLocal}` } })
        .then(res => {
            if (res.status === 401) {
                localStorage.clear();
                window.location.href = "/api/login/";
            }
            return res.json();
        })
        .then((data: any[]) => {
            memes = data.map(meme => ({
                id: meme.id,
                url: meme.image,
                category: meme.category
            }));
            currentPage = 1;
            filterGallery();
        })
        .catch(err => console.error("Error fetching memes:", err));
}

function deleteMeme(id: number | string): void {
    fetch(`http://127.0.0.1:8000/api/memes/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
        if (res.ok) {
            memes = memes.filter(m => m.id !== Number(id));
            filterGallery();
        } else {
            console.error("Failed to delete meme");
        }
    })
    .catch(err => console.error("Error deleting meme:", err));
}

document.addEventListener("click", function (e) {
    const target = e.target as HTMLElement;
    if (target.classList.contains("delete-meme-btn")) {
        const memeId = target.getAttribute("data-id");
        if (memeId) deleteMeme(memeId);
    }
});

function filterGallery(): void {
    if (!galleryContainer || !paginationContainer) return;
    galleryContainer.innerHTML = '';

    let eligibleMemes = chosenValue === "all" ? memes : memes.filter(m => m.category === chosenValue);

    const start = (currentPage - 1) * memesPerPage;
    const end = start + memesPerPage;
    const memesToShow = eligibleMemes.slice(start, end);

    memesToShow.forEach(m => {
        const galleryElement = document.createElement("div");
        galleryElement.classList.add("gallery-item");
        galleryElement.setAttribute("data-meme-id", String(m.id));
        galleryElement.innerHTML = `
            <img src="${m.url}">
            ${isAdmin ? `<button class="delete-meme-btn" data-id="${m.id}">Delete</button>` : ""}
        `;
        galleryContainer.appendChild(galleryElement);
    });

    renderPagination(eligibleMemes.length);
}

function renderPagination(totalMemes: number): void {
    if (!paginationContainer) return;
    paginationContainer.innerHTML = '';
    const totalPages = Math.max(1, Math.ceil(totalMemes / memesPerPage));

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.textContent = i.toString();
        btn.classList.add("page-btn");
        if (i === currentPage) btn.classList.add("active");
        btn.addEventListener("click", () => {
            currentPage = i;
            filterGallery();
        });
        paginationContainer.appendChild(btn);
    }
}

// attach btns from button container
if (btns != null) {
    for (let i = 0; i < btns.length; i++) {
    const el = btns[i] as HTMLElement;
    el.addEventListener("click", function (this: HTMLElement) {
        const current = document.getElementsByClassName("active");
        if (current.length > 0) {
            current[0].className = current[0].className.replace(" active", "");
        }
        this.className += " active";
        // @ts-ignore - many .btn elements may not be HTMLInputElement; keep behavior similar to original
        chosenValue = (this as any).value ?? chosenValue;
        currentPage = 1;
        filterGallery();
    });
}
}


// upload meme
const uploadBtn = document.getElementById("upload-btn") as HTMLButtonElement | null;
if (uploadBtn) {
    uploadBtn.addEventListener("click", function () {
        const tokenLocal = localStorage.getItem("access");
        const title = (document.getElementById("meme-title") as HTMLInputElement).value;
        const category = (document.getElementById("meme-category") as HTMLInputElement).value;
        const imageInput = document.getElementById("meme-image") as HTMLInputElement | null;
        const image = imageInput?.files?.[0];

        if (!image) {
            alert("Please select an image to upload.");
            return;
        }

        const formData = new FormData();
        formData.append("title", title);
        formData.append("category", category);
        formData.append("image", image);

        fetch("http://127.0.0.1:8000/api/memes/", {
            method: "POST",
            headers: { Authorization: `Bearer ${tokenLocal}` },
            body: formData
        })
        .then(res => res.json())
        .then(() => {
            alert("Meme uploaded!");
            loadMemesFromBackend();
        })
        .catch(err => console.error(err));
    });
}

// -------------------- Rating --------------------
async function loadRating(): Promise<void> {
    try {
        const res = await fetch(`${apiUrl}/website-rating/`, { headers: authHeaders() });
        const data = await res.json();
        if (starRatingValue) starRatingValue.textContent = String(data.rating ?? '0');
        highlightStars(String(data.rating ?? '0'));
    } catch (err) {
        console.error("Failed to load rating:", err);
    }
}

async function saveRating(value: string): Promise<void> {
    try {
        const res = await fetch(`${apiUrl}/website-rating/`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ rating: parseInt(value, 10) })
        });
        if (!res.ok) throw new Error("Failed to save rating");
    } catch (err) {
        console.error(err);
    }
}

function highlightStars(value: string): void {
    const numericValue = parseInt(value || '0', 10);
    document.querySelectorAll('.star-rating .star').forEach((star, index) => {
        (star as HTMLElement).classList.toggle('active', index < numericValue);
    });
}

if (starRating) {
    starRating.addEventListener('mouseover', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('star')) {
            highlightStars(target.dataset.value ?? '0');
        }
    });

    starRating.addEventListener('mouseout', () => {
        highlightStars(starRatingValue?.textContent ?? '0');
    });

    starRating.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('star')) {
            const value = target.dataset.value ?? '0';
            if (starRatingValue) starRatingValue.textContent = value;
            highlightStars(value);
            saveRating(value);
        }
    });
}

// -------------------- Quiz 1 --------------------
async function loadQuiz1(): Promise<void> {
    try {
        const res = await fetch(`${apiUrl}/quizzes/1/`, { headers: authHeaders() });
        const data = await res.json();
        quizData = data.questions.map((q: any) => ({
            question: q.text,
            options: q.answers.map((a: any) => ({ text: a.text, id: a.id }))
        }));
        loadQuestion1();
    } catch (err) {
        console.error("Failed to load quiz 1:", err);
    }
}

let currentQuestion1 = 0;
let uInd = false, gInd = false, jInd = false, wInd = false;

function loadQuestion1(): void {
    infoEl.textContent = "";
    imageEl.src = "";

    if (currentQuestion1 >= quizData.length) {
        void endQuiz1();
        return;
    }

    optionsEl.innerHTML = "";
    const q = quizData[currentQuestion1];
    questionEl.textContent = q.question;

    q.options.forEach(opt => {
        const btn = document.createElement("button");
        btn.classList.add("option");
        btn.textContent = opt.text;
        btn.onclick = () => checkAnswer1(opt);
        optionsEl.appendChild(btn);
    });
}

function checkAnswer1(option: { text: string; id: number }): void {
    selectedAnswers.push(option.id);

    if (currentQuestion1 === 0 && option.text === quizData[0].options[0].text) {
        uInd = true; gInd = true;
    } else if (currentQuestion1 === 0) {
        jInd = true; wInd = true;
    } else if (currentQuestion1 === 1 && option.text === quizData[1].options[0].text) {
        if (uInd || gInd) {
            uInd = false; gInd = true; jInd = false; wInd = false;
        } else {
            uInd = false; gInd = false; jInd = true; wInd = true;
        }
    } else if (currentQuestion1 === 1) {
        jInd = false; wInd = false; gInd = false; uInd = true;
    } else if (currentQuestion1 === 2 && option.text === quizData[2].options[0].text) {
        if (jInd) { jInd = false; wInd = true; }
        if (gInd || uInd) { jInd = false; wInd = false; }
    } else {
        if (wInd) { wInd = false; jInd = true; }
        if (gInd || uInd) { jInd = false; wInd = false; }
    }

    currentQuestion1++;
    loadQuestion1();
}

async function endQuiz1(): Promise<void> {
    try {
        await fetch(`${apiUrl}/quizzes/submit/`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ quiz: 1, answers: selectedAnswers })
        });

        const index = uInd ? 0 : gInd ? 1 : jInd ? 2 : 3;
        scoreEl.textContent = window.quizResults?.[index] ?? "";
        imageEl.src = window.quizImages?.[index] ?? "";
        infoEl.textContent = window.quizInfos?.[index] ?? "";

        questionEl.style.display = "none";
        optionsEl.style.display = "none";
        resultEl.style.display = "block";
        (restartBtn.style as any).display = "block";

        uInd = gInd = jInd = wInd = false;
        currentQuestion1 = 0;
    } catch (err) {
        console.error("Failed to submit quiz1:", err);
    }
}

restartBtn.onclick = () => {
    imageEl.src = "";
    scoreEl.textContent = "";
    infoEl.textContent = "";
    selectedAnswers = [];
    questionEl.style.display = "block";
    optionsEl.style.display = "flex";
    resultEl.style.display = "none";
    (restartBtn.style as any).display = "none";
    void loadQuiz1();
};

// -------------------- Quiz 2 --------------------

 
    let currentQuestion2 = 0;
async function loadQuiz2(): Promise<void> {
    try {
        const res = await fetch(`${apiUrl}/quizzes/2/`, { headers: authHeaders() });
        const quiz = await res.json();
        quizData2 = quiz.questions.map((q: any) => ({
            question: q.text,
            options: q.answers.map((a: any) => ({ text: a.text, id: a.id }))
        }));
        loadQuestion2();
    } catch (err) {
        console.error("Failed to load quiz 2:", err);
    }
}

function loadQuestion2(): void {
    if (currentQuestion2 >= quizData2.length) {
        void endQuiz2();
        return;
    }
    const q = quizData2[currentQuestion2];
    questionEl2.textContent = q.question;
    optionsEl2.innerHTML = "";

    q.options.forEach(opt => {
        const button = document.createElement("button");
        button.classList.add("option2");
        button.textContent = opt.text;
        button.onclick = () => {
            selectedAnswers2.push(opt.id);
            currentQuestion2++;
            loadQuestion2();
        };
        optionsEl2.appendChild(button);
    });
}

async function endQuiz2(): Promise<void> {
    try {
        const response = await fetch(`${apiUrl}/quizzes/submit/`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ quiz: 2, answers: selectedAnswers2 })
        });

        const result = await response.json();
        if (scoreEl2) scoreEl2.textContent = result.score ?? "";
        questionEl2.style.display = "none";
        optionsEl2.style.display = "none";
        resultEl2.style.display = "block";
        (restartBtn2.style as any).display = "block";
    } catch (err) {
        console.error("Failed to submit quiz2:", err);
    }
}

restartBtn2.onclick = () => {
    currentQuestion2 = 0;
    selectedAnswers2 = [];
    questionEl2.style.display = "block";
    optionsEl2.style.display = "flex";
    resultEl2.style.display = "none";
    (restartBtn2.style as any).display = "none";
    void loadQuiz2();
};

// -------------------- loadOnce (runners + results) --------------------
async function loadOnce(): Promise<void> {
    try {
        const response = await fetch(`${apiUrl}/runners/`, { headers: authHeaders() });
        const runners = await response.json();
        window.allRunners = await fetch(`${apiUrl}/runners/`, { headers: authHeaders() }).then(r => r.json());
        const resultsDiv = document.getElementById("results-list");
        if (!resultsDiv) return;
        resultsDiv.innerHTML = "";

        runners.forEach((runner: any) => {
            const item = document.createElement("div");
            item.classList.add("result-item");
            item.innerHTML = `
                <span class="result-name">${runner.name}:</span>
                <span class="result-votes">${runner.votes} </span>
            `;
            resultsDiv.appendChild(item);
        });
    } catch (err) {
        console.error("loadOnce failed:", err);
    }
}

// -------------------- Kick off initial loads --------------------
void loadTimeline();
void loadMemes();
void loadTimelineReferences();
void renderOrFetchStories(null);
void searchStories();
void loadRating();
void loadQuiz1();
void loadQuiz2();
void loadMemesFromBackend();
void loadRunners();
void loadOnce();
void fetchMileageHistory();
void loadStats();
    

    
});
