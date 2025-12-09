// menu
const showMenu = (toggleId, navId) =>{
    const toggle = document.getElementById(toggleId),
    nav = document.getElementById(navId)
    if(toggle && nav){
        toggle.addEventListener('click', ()=>{
            nav.classList.toggle('show')
        })
    }
}
showMenu('nav-toggle','nav-menu')

// scroll link
const sections = document.querySelectorAll('section[id]')
function scrollActive(){
    const scrollY = window.pageYOffset
    sections.forEach(current =>{
        const sectionHeight = current.offsetHeight
        const sectionTop = current.offsetTop - 58
        const sectionId = current.getAttribute('id')
        const link = document.querySelector('.nav__menu a[href*=' + sectionId + ']')
        if(link){
            if(scrollY > sectionTop && scrollY <= sectionTop + sectionHeight){
                link.classList.add('active-link')
            }else{
                link.classList.remove('active-link')
            }
        }
    })
}
window.addEventListener('scroll', scrollActive)

// scroll
const sr = ScrollReveal({
    origin: 'top', distance: '60px', duration: 800, delay: 100, reset: false
});

sr.reveal(`
    .section-title, .home__data, .home__img, .about__img, .about__data, 
    .skills__subtitle, .skills__text, .skills__data, .skills__img, 
    .work__img, .blog__controls, .footer__content
`, { interval: 100 });
sr.reveal('.contact__info, .contact__input, .contact__button', { interval: 100, viewFactor: 0.1 });

// typed animation
if(document.getElementById('typed')){
    new Typed('#typed', {
        strings: ['Video Editor', 'Multimedia Artist', 'Graphic Designer'],
        typeSpeed: 80, backSpeed: 50, backDelay: 2000, loop: true
    });
}

// firebase auth
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, query, orderBy, addDoc, serverTimestamp, 
    doc, deleteDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, getDoc, setDoc, increment, where, writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut,
    createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD-YuHdKQzLqwD1kvE7Z-bgmd-0LHCuNNU",
  authDomain: "vasquez-d5dda.firebaseapp.com",
  projectId: "vasquez-d5dda",
  storageBucket: "vasquez-d5dda.firebasestorage.app",
  messagingSenderId: "421293345114",
  appId: "1:421293345114:web:eb7330d56ce7bb10eacb63",
  measurementId: "G-D0FM69ZBP4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// roles n constants
const ADMIN_EMAIL = "kvincen07123@gmail.com";
const MOD_EMAIL = "kiervincent07123@gmail.com";
const DEFAULT_PROFILE_IMG = 'assets/img/guest_marker.png';

function isAdmin(email) { return email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase(); }
function isMod(email) { return email && email.toLowerCase() === MOD_EMAIL.toLowerCase(); }
function canManageBlogs(email) { return isAdmin(email) || isMod(email); }

function getEffectivePhotoURL(photoURL) {
    if (!photoURL || photoURL === "guest_marker") {
        return DEFAULT_PROFILE_IMG;
    }
    return photoURL;
}

let currentUser = null;
let latestSnapshot = null;
let isExpanded = false; 
let hasAnimatedBlogs = false;
let currentBlogIdForComments = null; 
let commentListenerUnsubscribe = null;
let modalDocUnsub = null; 
const openReplyIds = new Set();
let notifUnsubscribe = null;

// Elements
const navLogo = document.getElementById('navLogo');
const loginBtn = document.getElementById("loginBtn");
const userProfile = document.getElementById('userProfile');
const profileImg = document.getElementById('profileImg');
const profileIcon = document.getElementById('profileIcon'); 
const userNameDisplay = document.getElementById('userNameDisplay');
const logoutDropdown = document.getElementById('logoutDropdown');
const logoutBtn = document.getElementById('logoutBtn');
const mobileLoginItem = document.getElementById('mobileLoginItem');
const mobileLogoutItem = document.getElementById('mobileLogoutItem');

const addBlogBtn = document.getElementById("addBlogBtn");
const addBlogModal = document.getElementById("addBlogModal");
const editBlogModal = document.getElementById("editBlogModal");
const blogModal = document.getElementById("blogModal");
const logoutModal = document.getElementById("logoutModal");
const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");
const cancelLogoutBtn = document.getElementById("cancelLogoutBtn");

const blogList = document.getElementById("blog-list");
const emptyMsg = document.getElementById("emptyBlogsMessage");
const showMoreContainer = document.getElementById('showMoreContainer');
const showMoreBtn = document.getElementById('showMoreBtn');

const commentForm = document.getElementById("commentForm");
const commentsList = document.getElementById("commentsList");
const loginToCommentMsg = document.getElementById("loginToCommentMsg");

// Auth Modal Elements
const loginModal = document.getElementById("loginModal");
const registerModal = document.getElementById("registerModal");
const openRegisterLink = document.getElementById("openRegisterLink");
const openLoginLink = document.getElementById("openLoginLink");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const googleRegBtn = document.getElementById("googleRegBtn");

// Notification Elements
const notifDropdownContainer = document.getElementById('notifDropdownContainer');
const notifBtn = document.getElementById('notifBtn');
const notifDropdown = document.getElementById('notifDropdown');
const notifList = document.getElementById('notifList');
const notifBadge = document.getElementById('notifBadge');
const markAllReadBtn = document.getElementById('markAllRead');

// 1. handle auth flows

document.querySelectorAll('.password-toggle').forEach(icon => {
    icon.addEventListener('click', function() {
        const input = this.previousElementSibling;
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        
        this.classList.toggle('bx-hide');
        this.classList.toggle('bx-show');
    });
});

// login modal
function openLoginModal(e) {
    if(e) e.preventDefault();
    loginModal.style.display = "block";
    registerModal.style.display = "none";
    if(logoutDropdown) logoutDropdown.classList.remove('show-dropdown');
    const navMenu = document.getElementById('nav-menu');
    navMenu.classList.remove('show');
}

if(loginBtn) loginBtn.addEventListener("click", openLoginModal);
if(mobileLoginItem) mobileLoginItem.addEventListener("click", openLoginModal);

if(openRegisterLink) {
    openRegisterLink.addEventListener("click", () => {
        loginModal.style.display = "none";
        registerModal.style.display = "block";
    });
}

if(openLoginLink) {
    openLoginLink.addEventListener("click", () => {
        registerModal.style.display = "none";
        loginModal.style.display = "block";
    });
}

document.querySelectorAll(".close-button").forEach(btn => {
    btn.addEventListener("click", () => {
        if (btn.id === "closeLoginModal") loginModal.style.display = "none";
        if (btn.id === "closeRegisterModal") registerModal.style.display = "none";
        if (btn.id === "closeBlogModal") closeBlogModalFunction();
        if (btn.id === "closeAddBlogModal") addBlogModal.style.display = "none";
        if (btn.id === "closeEditBlogModal") editBlogModal.style.display = "none";
        if (btn.id === "closeLogoutModal") logoutModal.style.display = "none";
    });
});

// A. google login
async function handleGoogleLogin() {
    try {
        await signInWithPopup(auth, provider);
        loginModal.style.display = "none";
        registerModal.style.display = "none";
    } catch (error) {
        console.error("Login Error:", error);
        alert("Login Failed: " + error.message);
    }
}
if(googleLoginBtn) googleLoginBtn.addEventListener("click", handleGoogleLogin);
if(googleRegBtn) googleRegBtn.addEventListener("click", handleGoogleLogin);

// B. email login
document.getElementById("emailLoginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const pass = document.getElementById("loginPassword").value;
    
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        loginModal.style.display = "none";
        e.target.reset();
    } catch (error) {
        console.error("Login Error Code:", error.code);
        let msg = "An unknown error occurred.";
        
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            msg = "Incorrect Email or Password. Please try again.";
        } else if (error.code === 'auth/too-many-requests') {
            msg = "Too many failed attempts. Please try again later.";
        } else if (error.code === 'auth/invalid-email') {
            msg = "Invalid email format.";
        } else {
            msg = "Error: " + error.message;
        }
        alert(msg);
    }
});

// C. create acc (register)
document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const firstName = document.getElementById("regFirstName").value;
    const lastName = document.getElementById("regLastName").value;
    const email = document.getElementById("regEmail").value;
    const pass = document.getElementById("regPassword").value;
    
    const submitBtn = e.target.querySelector("button[type='submit']");
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Creating...";
    submitBtn.disabled = true;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        await updateProfile(user, {
            displayName: `${firstName} ${lastName}`,
            photoURL: "guest_marker" 
        });

        alert("Account has been created successfully! You can now log in.");
        
        await signOut(auth);
        
        registerModal.style.display = "none";
        loginModal.style.display = "block"; 
        e.target.reset();

    } catch (error) {
        let msg = "Registration failed.";
        if (error.code === 'auth/email-already-in-use') msg = "This email is already registered.";
        else if (error.code === 'auth/weak-password') msg = "Password must be at least 6 characters.";
        else msg = error.message;
        alert(msg);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// logout
function showLogoutConfirmation() {
    logoutModal.style.display = "block";
    logoutDropdown.classList.remove('show-dropdown'); 
}
if(logoutBtn) logoutBtn.addEventListener("click", showLogoutConfirmation);
if(mobileLogoutItem) mobileLogoutItem.addEventListener("click", showLogoutConfirmation);

if(confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener("click", async () => {
        try {
            await signOut(auth);
            logoutModal.style.display = "none";
            alert("Logged out successfully.");
        } catch (error) { console.error(error); }
    });
}
if(cancelLogoutBtn) cancelLogoutBtn.addEventListener("click", () => logoutModal.style.display = "none");

// pic dropdown toggle
function toggleProfileDropdown(e) {
    e.stopPropagation();
    logoutDropdown.classList.toggle('show-dropdown');
    if(notifDropdown) notifDropdown.classList.remove('show-notif');
}

if(profileImg) profileImg.addEventListener('click', toggleProfileDropdown);
if(profileIcon) {
    profileIcon.style.display = 'none'; 
    profileIcon.addEventListener('click', toggleProfileDropdown);
}


// notif toggle
if(notifBtn) {
    notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifDropdown.classList.toggle('show-notif');
        if(logoutDropdown) logoutDropdown.classList.remove('show-dropdown');
    });
}

window.addEventListener('click', (e) => {
    if (userProfile && !userProfile.contains(e.target)) logoutDropdown.classList.remove('show-dropdown');
    if (notifDropdownContainer && !notifDropdownContainer.contains(e.target)) notifDropdown.classList.remove('show-notif');
    if (e.target == addBlogModal) addBlogModal.style.display = "none";
    if (e.target == editBlogModal) editBlogModal.style.display = "none";
    if (e.target == loginModal) loginModal.style.display = "none";
    if (e.target == registerModal) registerModal.style.display = "none";
    if (e.target == blogModal) closeBlogModalFunction();
    if (e.target == logoutModal) logoutModal.style.display = "none";
});

// 2. auth state
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const logoHtml = '<img src="assets/img/KLogo.png" alt="Logo" style="height: 50px; width: auto; display: block;">';

    if (user) {
        loginBtn.style.display = 'none'; 
        userProfile.style.display = 'flex'; 
        notifDropdownContainer.style.display = 'flex'; 
        mobileLoginItem.style.display = 'none'; 
        mobileLogoutItem.style.display = 'block'; 
        
        const effectivePhoto = getEffectivePhotoURL(user.photoURL);
        
        if (effectivePhoto === DEFAULT_PROFILE_IMG || user.photoURL === "guest_marker") {
            profileImg.style.display = 'none';
            if(profileIcon) {
                profileIcon.style.display = 'flex'; 
            }
        } else {
            profileImg.style.display = 'block';
            profileImg.src = effectivePhoto;
            if(profileIcon) profileIcon.style.display = 'none'; 
        }

        userNameDisplay.textContent = user.displayName;

        if(canManageBlogs(user.email)){
            addBlogBtn.style.display = "inline-flex";
            addBlogBtn.style.alignItems = "center";
            addBlogBtn.style.gap = "5px";
            if(isAdmin(user.email)) navLogo.innerHTML = `${logoHtml} Kier <span style="font-size:0.8rem">(Admin)</span>`;
            else navLogo.innerHTML = `${logoHtml} Kier <span style="font-size:0.8rem">(Mod)</span>`;
        } else {
            addBlogBtn.style.display = "none";
            navLogo.innerHTML = `${logoHtml} Visitor`;
        }
        if(commentForm) commentForm.style.display = "block";
        if(loginToCommentMsg) loginToCommentMsg.style.display = "none";
        
        initNotifications(user); 

    } else {
        loginBtn.style.display = 'block'; 
        userProfile.style.display = 'none'; 
        notifDropdownContainer.style.display = 'none'; 
        mobileLoginItem.style.display = 'block'; 
        mobileLogoutItem.style.display = 'none'; 
        navLogo.innerHTML = `${logoHtml} Kier`;
        addBlogBtn.style.display = "none";
        if(commentForm) commentForm.style.display = "none";
        if(loginToCommentMsg) loginToCommentMsg.style.display = "block";
        
        if(notifUnsubscribe) notifUnsubscribe();
    }
    refreshBlogUI(); 
    handleVisitorSession(user);
});

// 3. notif logic

// creating notifications
async function createNotification(type, data) {
    if (!currentUser) return;
    
    const notifData = {
        type: type,
        senderUid: currentUser.uid,
        senderName: currentUser.displayName || "Anonymous",
        senderPhoto: getEffectivePhotoURL(currentUser.photoURL),
        timestamp: serverTimestamp(),
        readBy: [], 
        ...data 
    };

    try {
        await addDoc(collection(db, "notifications"), notifData);
    } catch (e) { console.error("Error sending notif:", e); }
}

// notification
function initNotifications(user) {
    if(notifUnsubscribe) notifUnsubscribe();
    const q = query(collection(db, "notifications"), orderBy("timestamp", "desc")); 

    notifUnsubscribe = onSnapshot(q, (snapshot) => {
        const notifs = [];
        let unreadCount = 0;

        snapshot.forEach(doc => {
            const n = { id: doc.id, ...doc.data() };
            let isRelevant = false;

            if (isAdmin(user.email)) {
                if (n.senderUid !== user.uid) isRelevant = true;
            } else if (isMod(user.email)) {
                const modTypes = ['like', 'comment', 'reply', 'also_like'];
                if (modTypes.includes(n.type) && n.senderUid !== user.uid) isRelevant = true;
            } else {
                if (n.type === 'reply' && n.targetUid === user.uid) isRelevant = true;
                else if (n.type === 'also_like' && n.targetUids && n.targetUids.includes(user.uid)) isRelevant = true;
            }

            if (isRelevant) {
                n.isRead = n.readBy && n.readBy.includes(user.uid);
                if (!n.isRead) unreadCount++;
                notifs.push(n);
            }
        });

        renderNotifications(notifs);
        
        if(unreadCount > 0) {
            notifBadge.style.display = "block";
            notifBadge.textContent = unreadCount > 9 ? "9+" : unreadCount;
        } else {
            notifBadge.style.display = "none";
        }
    });
}

function renderNotifications(notifs) {
    notifList.innerHTML = "";
    if (notifs.length === 0) {
        notifList.innerHTML = `<div style="padding: 20px; text-align: center; color: #888; font-size: 0.85rem;">No new notifications.</div>`;
        return;
    }

    notifs.forEach(n => {
        const item = document.createElement("div");
        item.className = `notif__item ${n.isRead ? '' : 'unread'}`;
        
        let imgHtml;
        if (n.senderPhoto === DEFAULT_PROFILE_IMG || n.senderPhoto === "guest_marker" || !n.senderPhoto) {
            imgHtml = `<div class="notif__icon-circle"><i class='bx bx-user'></i></div>`;
        } else {
            imgHtml = `<img src="${n.senderPhoto}" class="notif__img">`;
        }
        
        let text = "";
        switch(n.type) {
            case 'like': text = `<strong>${n.senderName}</strong> liked a blog post.`; break;
            case 'also_like': text = `<strong>${n.senderName}</strong> liked a blog you liked.`; break;
            case 'comment': text = `<strong>${n.senderName}</strong> commented on a blog post.`; break;
            case 'reply': text = `<strong>${n.senderName}</strong> replied to your comment.`; break;
            case 'visitor': text = `<strong>New Visitor</strong> detected on the site.`; break;
            case 'contact': text = `<strong>${n.senderName}</strong> sent a message via Contact Form.`; break;
        }

        item.innerHTML = `
            ${imgHtml}
            <div class="notif__content">
                <span class="notif__text">${text}</span>
                <span class="notif__time">${timeAgo(n.timestamp ? n.timestamp.toDate() : new Date())}</span>
            </div>
            ${!n.isRead ? '<div style="width:8px; height:8px; background:var(--first-color); border-radius:50%;"></div>' : ''}
        `;

        item.addEventListener("click", async () => {
            if (!n.isRead) {
                const notifRef = doc(db, "notifications", n.id);
                await updateDoc(notifRef, { readBy: arrayUnion(currentUser.uid) });
            }
            if (n.type === 'contact') {
                window.location.hash = "#contact";
            } else if (n.blogId) {
                const blogDoc = await getDoc(doc(db, "blogs", n.blogId));
                if(blogDoc.exists()) {
                    openBlogModal(n.blogId, blogDoc.data());
                    if (n.commentId) {
                        setTimeout(() => scrollToComment(n.commentId), 1000); 
                    }
                }
            }
            notifDropdown.classList.remove('show-notif');
        });

        notifList.appendChild(item);
    });
}

if(markAllReadBtn) {
    markAllReadBtn.addEventListener("click", async () => {
        alert("Please click notifications to mark them as read."); 
    });
}

function scrollToComment(cid) {
    const el = document.getElementById(`comment-item-${cid}`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight-comment');
        setTimeout(() => el.classList.remove('highlight-comment'), 3000);
    }
}

// 4. modal logic
if(addBlogBtn) addBlogBtn.addEventListener("click", () => addBlogModal.style.display = "block");

function closeBlogModalFunction() {
    blogModal.style.display = "none";
    document.body.classList.remove('no-scroll');
    if(commentListenerUnsubscribe) { commentListenerUnsubscribe(); commentListenerUnsubscribe = null; }
    if(modalDocUnsub) { modalDocUnsub(); modalDocUnsub = null; }
    openReplyIds.clear();
}

document.getElementById("add-blog-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if(!currentUser || !canManageBlogs(currentUser.email)) return;
    const msg = document.getElementById("post-message");
    msg.textContent = "Posting...";
    try {
        let authorName = currentUser.displayName || currentUser.email.split('@')[0];
        await addDoc(collection(db, "blogs"), {
            title: document.getElementById("new-blog-title").value,
            image: document.getElementById("new-blog-image").value,
            description: document.getElementById("new-blog-description").value,
            link: document.getElementById("new-blog-link").value,
            author: authorName, authorEmail: currentUser.email, 
            authorPhoto: getEffectivePhotoURL(currentUser.photoURL),
            createdAt: serverTimestamp(), likedBy: [] 
        });
        msg.textContent = "Success!";
        document.getElementById("add-blog-form").reset();
        setTimeout(() => { addBlogModal.style.display = "none"; msg.textContent=""; }, 1000);
    } catch (err) { msg.textContent = "Error: " + err.message; }
});

document.getElementById("edit-blog-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if(!currentUser || !canManageBlogs(currentUser.email)) return;
    const msg = document.getElementById("edit-message");
    const id = document.getElementById("edit-blog-id").value;
    msg.textContent = "Updating...";
    try {
        await updateDoc(doc(db, "blogs", id), {
            title: document.getElementById("edit-blog-title").value,
            image: document.getElementById("edit-blog-image").value,
            link: document.getElementById("edit-blog-link").value,
            description: document.getElementById("edit-blog-description").value
        });
        msg.textContent = "Success!";
        setTimeout(() => { editBlogModal.style.display = "none"; msg.textContent=""; }, 1000);
    } catch (err) { msg.textContent = "Error: " + err.message; }
});

if(showMoreBtn) showMoreBtn.addEventListener('click', () => { isExpanded = !isExpanded; renderBlogList(); });

const q = query(collection(db, "blogs"), orderBy("createdAt", "desc"));
onSnapshot(q, (snapshot) => { latestSnapshot = snapshot; renderBlogList(); });

function renderBlogList() {
    blogList.innerHTML = "";
    if(!latestSnapshot || latestSnapshot.empty){
        emptyMsg.style.display = "block";
        const isManager = currentUser && canManageBlogs(currentUser.email);
        emptyMsg.textContent = isManager ? "No blogs posted yet." : "The blogs are empty";
        showMoreContainer.style.display = 'none';
        return;
    } 
    emptyMsg.style.display = "none";
    const docs = latestSnapshot.docs;
    const total = docs.length;
    if (total > 3) {
        showMoreContainer.style.display = 'block';
        showMoreBtn.textContent = isExpanded ? "Show Less" : "Show More";
    } else { showMoreContainer.style.display = 'none'; }
    
    const limit = isExpanded ? total : 3;
    const visibleDocs = docs.slice(0, limit);
    visibleDocs.forEach(docSnap => {
        blogList.appendChild(createBlogCard(docSnap.id, docSnap.data()));
    });
    if (!hasAnimatedBlogs) {
        sr.reveal('.blog__content', { interval: 100 });
        hasAnimatedBlogs = true;
    }
}

function createBlogCard(id, data) {
    const div = document.createElement("div");
    div.className = "blog__content";
    div.setAttribute("data-id", id);
    div.style.cursor = "pointer"; 
    
    let date = "";
    if (data.createdAt && typeof data.createdAt.toDate === 'function') date = data.createdAt.toDate().toLocaleDateString();
    
    const likes = data.likedBy ? data.likedBy.length : 0;
    
    // Author for Card
    let authorName = (data.author || data.authorName || "Admin").split('@')[0];
    let authorPhoto = getEffectivePhotoURL(data.authorPhoto);
    
    let authorHtml = authorName;
    if(data.authorEmail) {
        if(isAdmin(data.authorEmail)) authorHtml += ` <span class="admin-badge"><i class='bx bxs-badge-check'></i> Admin</span>`;
        else if (isMod(data.authorEmail)) authorHtml += ` <span class="mod-badge"><i class='bx bxs-badge-check'></i> Mod</span>`;
    }

    div.innerHTML = `
        <img src="${data.image}" class="blog__img">
        <div class="blog__data">
            <h3 class="blog__title">${data.title}</h3>
            <div class="blog__meta-header">
                <img src="${authorPhoto}" class="blog__author-avatar">
                <p class="blog__date">${authorHtml} &nbsp;·&nbsp; ${date}</p>
            </div>
            <p class="blog__description">${data.description}</p>
            <div class="blog__actions">
                <span class="blog__button view-btn">Read More</span>
                <div class="blog__icons">
                    <div class="blog__like">
                        <i class='bx bx-heart like-icon'></i>
                        <span class="like-count">${likes}</span>
                    </div>
                    <div class="blog__comment" style="color: #888; font-size: 1.2rem; display: flex; align-items: center; margin-left: 10px;">
                        <i class='bx bx-message-rounded'></i>
                    </div>
                    <div class="admin-tools" style="display:none; gap:10px; margin-left:10px;">
                        <i class='bx bx-pencil edit-btn' style="color:var(--first-color); cursor:pointer; font-size:1.2rem;"></i>
                        <i class='bx bx-trash delete-btn' style="color:red; cursor:pointer; font-size:1.2rem;"></i>
                    </div>
                </div>
            </div>
        </div>
    `;

    div.addEventListener("click", () => openBlogModal(id, data));

    // Like
    div.querySelector(".blog__like").addEventListener("click", async (e) => {
        e.stopPropagation();
        if(!currentUser) { openLoginModal(); return; }
        
        const blogRef = doc(db, "blogs", id);
        const uid = currentUser.uid;
        
        const alreadyLiked = data.likedBy && data.likedBy.includes(uid);
        
        if (alreadyLiked) {
            await updateDoc(blogRef, { likedBy: arrayRemove(uid) });
        } else {
            await updateDoc(blogRef, { likedBy: arrayUnion(uid) });
            await createNotification('like', { blogId: id });
            if (data.likedBy && data.likedBy.length > 0) {
                 const previousLikers = data.likedBy.slice(0, 20); 
                 await createNotification('also_like', { blogId: id, targetUids: previousLikers });
            }
        }
    });

    div.querySelector(".delete-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        if(confirm("Delete post?")) deleteDoc(doc(db, "blogs", id));
    });

    div.querySelector(".edit-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        document.getElementById("edit-blog-id").value = id;
        document.getElementById("edit-blog-title").value = data.title;
        document.getElementById("edit-blog-image").value = data.image;
        document.getElementById("edit-blog-link").value = data.link;
        document.getElementById("edit-blog-description").value = data.description;
        editBlogModal.style.display = "block";
    });
    
    updateUIForCard(div, data);
    return div;
}

function updateUIForCard(card, data) {
    const isManager = currentUser && canManageBlogs(currentUser.email);
    const adminTools = card.querySelector(".admin-tools");
    if(adminTools) adminTools.style.display = isManager ? "flex" : "none";
    
    const likeIcon = card.querySelector(".like-icon");
    const likes = data.likedBy || [];
    if(currentUser && likes.includes(currentUser.uid)) {
        likeIcon.classList.remove('bx-heart');
        likeIcon.classList.add('bxs-heart'); 
        likeIcon.style.color = "red";
    } else {
        likeIcon.classList.remove('bxs-heart');
        likeIcon.classList.add('bx-heart'); 
        likeIcon.style.color = ""; 
    }
}

function refreshBlogUI() {
    document.querySelectorAll(".blog__content").forEach(card => {
        const id = card.getAttribute("data-id");
        const docSnap = latestSnapshot?.docs.find(d => d.id === id);
        if(docSnap) updateUIForCard(card, docSnap.data());
    });
}

function timeAgo(date) {
    if(!date) return "";
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return "Just now";
}

function openBlogModal(id, initialData) {
    try {
        currentBlogIdForComments = id;
        document.body.classList.add('no-scroll');
        blogModal.style.display = "block";

        const blogRef = doc(db, "blogs", id);

        document.getElementById("blogAuthorImg").src = getEffectivePhotoURL(initialData.authorPhoto);
        const authorNameEl = document.getElementById("blogAuthorName");
        const modalTitleEl = document.getElementById("blogModalTitle");
        
        let authorName = (initialData.author || initialData.authorName || "Admin").split('@')[0];
        authorNameEl.innerHTML = authorName;
        modalTitleEl.textContent = `${authorName}'s Blog`;

        if (isAdmin(initialData.authorEmail)) authorNameEl.innerHTML += ` <span class="admin-badge"><i class='bx bxs-badge-check'></i> Admin</span>`;

        let timeStr = initialData.createdAt && typeof initialData.createdAt.toDate === 'function' ? timeAgo(initialData.createdAt.toDate()) : "Just now";
        document.getElementById("blogPostDate").textContent = timeStr;
        document.getElementById("blogViewDescription").textContent = initialData.description;
        document.getElementById("blogViewImage").src = initialData.image;

        const sourceLink = document.getElementById("modalSourceLink");
        if(initialData.link) {
            sourceLink.href = initialData.link;
            sourceLink.style.display = "flex";
        } else {
            sourceLink.style.display = "none";
        }

        if (modalDocUnsub) modalDocUnsub(); 
        
        modalDocUnsub = onSnapshot(blogRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const likeCount = data.likedBy ? data.likedBy.length : 0;
                document.getElementById("modalLikeCount").textContent = likeCount;

                const modalLikeIcon = document.getElementById("modalLikeIcon");
                if (currentUser && data.likedBy && data.likedBy.includes(currentUser.uid)) {
                    modalLikeIcon.classList.remove('bx-heart');
                    modalLikeIcon.classList.add('bxs-heart');
                    modalLikeIcon.style.color = "red";
                } else {
                    modalLikeIcon.classList.remove('bxs-heart');
                    modalLikeIcon.classList.add('bx-heart');
                    modalLikeIcon.style.color = "var(--text-color)";
                }
            }
        });

        document.getElementById("modalLikeBtn").onclick = async (e) => {
            e.stopPropagation();
            if(!currentUser) { openLoginModal(); return; }
            const modalLikeIcon = document.getElementById("modalLikeIcon");
            const isLiked = modalLikeIcon.classList.contains('bxs-heart');
            if (isLiked) await updateDoc(blogRef, { likedBy: arrayRemove(currentUser.uid) });
            else {
                await updateDoc(blogRef, { likedBy: arrayUnion(currentUser.uid) });
                await createNotification('like', { blogId: id });
                if (initialData.likedBy && initialData.likedBy.length > 0) {
                     const previousLikers = initialData.likedBy.slice(0, 20); 
                     await createNotification('also_like', { blogId: id, targetUids: previousLikers });
                }
            }
        };

        if(currentUser) {
            commentForm.style.display = "block";
            loginToCommentMsg.style.display = "none";
        } else {
            commentForm.style.display = "none";
            loginToCommentMsg.style.display = "block";
        }

        if(commentListenerUnsubscribe) commentListenerUnsubscribe();
        const commentsQuery = query(collection(db, "blogs", id, "comments"), orderBy("createdAt", "asc"));
        
        commentListenerUnsubscribe = onSnapshot(commentsQuery, (snapshot) => {
            commentsList.innerHTML = "";
            if(snapshot.empty) {
                commentsList.innerHTML = "<p style='text-align:center; color:#999; font-size:0.85rem;'>No comments yet.</p>";
            } else {
                const allComments = [];
                snapshot.forEach(docSnap => {
                    allComments.push({ id: docSnap.id, ...docSnap.data() });
                });

                const parentComments = allComments.filter(c => !c.parentId);
                
                parentComments.forEach(c => {
                    const childComments = allComments.filter(child => child.parentId === c.id);
                    const div = createCommentElement(c, id, childComments.length);
                    commentsList.appendChild(div);
                    
                    if(childComments.length > 0) {
                        const replyListContainer = document.createElement("div");
                        replyListContainer.className = "replies-list";
                        replyListContainer.id = `replies-for-${c.id}`;
                        if(openReplyIds.has(c.id)) replyListContainer.classList.add('show');
                        childComments.forEach(child => {
                            const childDiv = createCommentElement(child, id, 0);
                            replyListContainer.appendChild(childDiv);
                        });
                        div.appendChild(replyListContainer);
                    }
                });
            }
        });

    } catch(error) {
        console.error("Error opening modal:", error);
        document.body.classList.remove('no-scroll');
    }
}

function createCommentElement(c, blogId, replyCount) {
    const cid = c.id;
    let dateStr = c.createdAt && typeof c.createdAt.toDate === 'function' ? timeAgo(c.createdAt.toDate()) : "Just now";
    const likes = c.likedBy ? c.likedBy.length : 0;
    const isLiked = currentUser && c.likedBy && c.likedBy.includes(currentUser.uid);
    
    let authorHtml = `${c.author}`;
    if(c.email) {
        if(isAdmin(c.email)) authorHtml += ` <span class="admin-badge"><i class='bx bxs-badge-check'></i> Admin</span>`;
        else if (isMod(c.email)) authorHtml += ` <span class="mod-badge"><i class='bx bxs-badge-check'></i> Mod</span>`;
    }
    
    // def photo
    let avatarHtml;
    const photoUrl = getEffectivePhotoURL(c.photoURL);

    if (photoUrl === DEFAULT_PROFILE_IMG || c.photoURL === "guest_marker") {
        avatarHtml = `<div class="comment-avatar-icon"><i class='bx bx-user'></i></div>`;
    } else {
        avatarHtml = `<img src="${photoUrl}" class="comment-avatar">`;
    }

    let replyToggleHtml = '';
    if (replyCount > 0) {
        replyToggleHtml = `
            <button class="view-replies-btn" onclick="window.toggleReplies('${cid}')">
                <i class='bx bx-subdirectory-right'></i>
                View ${replyCount} repl${replyCount === 1 ? 'y' : 'ies'}
            </button>
        `;
    }

    let adminToolsHtml = '';
    if (currentUser && canManageBlogs(currentUser.email)) {
        adminToolsHtml = `
            <div class="comment-tools admin-tools-container">
                <i class='bx bx-trash tool-btn delete-comment-btn' title="Delete Comment"></i>
            </div>
        `;
    }

    let userToolsHtml = '';
    const now = new Date();
    let commentTime = new Date();
    if(c.createdAt && typeof c.createdAt.toDate === 'function') commentTime = c.createdAt.toDate();
    const minutesDiff = (now - commentTime) / 1000 / 60;

    if (currentUser && currentUser.uid === c.uid && minutesDiff <= 10) {
         userToolsHtml = `
            <div class="comment-tools user-tools-container" style="${adminToolsHtml ? 'right: -55px;' : ''}">
                <i class='bx bx-pencil tool-btn edit-comment-btn' title="Edit Comment"></i>
            </div>
         `;
    }
    
    const div = document.createElement("div");
    div.className = "comment-item-container";
    div.innerHTML = `
        <div class="comment-item group" id="comment-item-${cid}">
            ${avatarHtml}
            <div class="comment-body">
                <div class="comment-bubble">
                    <span class="comment-author">${authorHtml}</span>
                    <p class="comment-text" id="comment-text-${cid}">${c.text}</p>
                    ${adminToolsHtml}
                    ${userToolsHtml}
                </div>
                 <div class="comment-edit-form" id="edit-form-${cid}" style="display:none;">
                    <textarea class="edit-comment-input">${c.text}</textarea>
                    <div class="edit-actions">
                        <span class="save-edit-btn">Save</span>
                        <span class="cancel-edit-btn">Cancel</span>
                    </div>
                 </div>
                <div class="comment-actions">
                    <span class="comment-action-btn comment-like ${isLiked ? 'active' : ''}" data-cid="${cid}">
                        ${isLiked ? 'Like' : 'Like'} ${likes > 0 ? `(${likes})` : ''}
                    </span>
                    ·
                    <span class="comment-action-btn comment-reply" data-cid="${cid}">Reply</span>
                    ·
                    <span class="comment-date">${dateStr}</span>
                </div>
                <div class="reply-input-container" id="reply-box-${cid}">
                     <form class="reply-form">
                        <input type="text" class="reply-input" placeholder="Reply to ${c.author}...">
                     </form>
                </div>
            </div>
        </div>
        ${replyToggleHtml}
    `;

    // Commenters
    div.querySelector(".comment-like").addEventListener("click", async () => {
        if(!currentUser) return;
        const commentRef = doc(db, "blogs", blogId, "comments", cid);
        if(isLiked) await updateDoc(commentRef, { likedBy: arrayRemove(currentUser.uid) });
        else await updateDoc(commentRef, { likedBy: arrayUnion(currentUser.uid) });
    });

    div.querySelector(".comment-reply").addEventListener("click", (e) => {
        if(!currentUser) { alert("Login to reply"); return; }
        const replyBox = div.querySelector(`#reply-box-${cid}`);
        replyBox.classList.toggle("show");
        if(replyBox.classList.contains("show")) replyBox.querySelector("input").focus();
    });

    const replyInput = div.querySelector(".reply-input");
    replyInput.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); 
            div.querySelector(".reply-form").dispatchEvent(new Event('submit'));
        }
    });

    div.querySelector(".reply-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = e.target.querySelector("input");
        const text = input.value;
        if(!text.trim()) return;
        const actualParentId = c.parentId ? c.parentId : cid;

        try {
            const replyRef = await addDoc(collection(db, "blogs", blogId, "comments"), {
                text: text,
                author: currentUser.displayName || "Anonymous",
                email: currentUser.email,
                photoURL: getEffectivePhotoURL(currentUser.photoURL),
                uid: currentUser.uid,
                parentId: actualParentId,
                createdAt: serverTimestamp(),
                likedBy: []
            });
            input.value = "";
            div.querySelector(`#reply-box-${cid}`).classList.remove("show");
            openReplyIds.add(actualParentId);

            if (c.uid !== currentUser.uid) {
                await createNotification('reply', { blogId: blogId, commentId: replyRef.id, targetUid: c.uid });
            } else {
                await createNotification('comment', { blogId: blogId, commentId: replyRef.id });
            }

        } catch(err) { console.error(err); }
    });

    const deleteBtn = div.querySelector(".delete-comment-btn");
    if(deleteBtn) {
        deleteBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            if(confirm("Delete this comment permanently?")) await deleteDoc(doc(db, "blogs", blogId, "comments", cid));
        });
    }

    const editBtn = div.querySelector(".edit-comment-btn");
    if(editBtn) {
        const textDisplay = div.querySelector(`#comment-text-${cid}`);
        const editForm = div.querySelector(`#edit-form-${cid}`);
        const editInput = editForm.querySelector('.edit-comment-input');
        const saveBtn = editForm.querySelector('.save-edit-btn');
        const cancelBtn = editForm.querySelector('.cancel-edit-btn');
        const adminToolsContainer = div.querySelector(".admin-tools-container");
        const userToolsContainer = div.querySelector(".user-tools-container");

        editBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            textDisplay.style.display = 'none';
            editForm.style.display = 'flex';
            editInput.focus();
            if(adminToolsContainer) adminToolsContainer.style.display = 'none';
            if(userToolsContainer) userToolsContainer.style.display = 'none';
        });

        editInput.addEventListener("keydown", (e) => {
            if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveBtn.click(); }
        });

        cancelBtn.addEventListener("click", () => {
            textDisplay.style.display = 'block';
            editForm.style.display = 'none';
            editInput.value = c.text;
            if(adminToolsContainer) adminToolsContainer.style.display = 'flex';
            if(userToolsContainer) userToolsContainer.style.display = 'flex';
        });

         saveBtn.addEventListener("click", async () => {
            const newText = editInput.value.trim();
            if(newText && newText !== c.text) {
                await updateDoc(doc(db, "blogs", blogId, "comments", cid), { text: newText, editedAt: serverTimestamp() });
            } else { cancelBtn.click(); }
        });
    }

    return div;
}

window.toggleReplies = (parentId) => {
    const list = document.getElementById(`replies-for-${parentId}`);
    if(list) {
        list.classList.toggle('show');
        if(list.classList.contains('show')) openReplyIds.add(parentId);
        else openReplyIds.delete(parentId);
    }
}

if(commentForm) {
    const mainInput = document.getElementById("commentInput");
    mainInput.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commentForm.dispatchEvent(new Event('submit')); }
        mainInput.style.height = 'auto';
        mainInput.style.height = (mainInput.scrollHeight) + 'px';
    });

    commentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if(!currentUser || !currentBlogIdForComments) return;
        const text = mainInput.value;
        if(!text.trim()) return;
        try {
            const commentRef = await addDoc(collection(db, "blogs", currentBlogIdForComments, "comments"), {
                text: text,
                author: currentUser.displayName || "Anonymous",
                email: currentUser.email,
                photoURL: getEffectivePhotoURL(currentUser.photoURL),
                uid: currentUser.uid,
                parentId: null, 
                createdAt: serverTimestamp(),
                likedBy: []
            });
            mainInput.value = "";
            mainInput.style.height = '40px';
            await createNotification('comment', { blogId: currentBlogIdForComments, commentId: commentRef.id });
        } catch(err) { alert("Failed to post comment: " + err.message); }
    });
}

// EmailJS
if (document.getElementById('contact-form')) {
    document.getElementById('contact-form').addEventListener('submit', function(event) {
        event.preventDefault();
        const userName = this.user_name.value;
        emailjs.sendForm('service_cldcdrq', 'template_kvhnz1g', this)
            .then(async function() {
                alert('Message sent successfully!');
                document.getElementById('contact-form').reset();
                if (currentUser) await createNotification('contact', { senderName: userName });
                else {
                    try {
                        await addDoc(collection(db, "notifications"), {
                            type: 'contact', senderUid: 'visitor', senderName: userName, senderPhoto: DEFAULT_PROFILE_IMG, timestamp: serverTimestamp(), readBy: []
                        });
                    } catch(e) { console.error(e); }
                }
            }, function(error) { alert('Failed. ' + error); });
    });
}

// Dark/Light theme
const themeButton = document.getElementById('theme-button')
const darkTheme = 'dark-theme'
const iconTheme = 'bx-sun' 

const selectedTheme = localStorage.getItem('selected-theme')
const selectedIcon = localStorage.getItem('selected-icon')

const getCurrentTheme = () => document.body.classList.contains(darkTheme) ? 'dark' : 'light'
const getCurrentIcon = () => themeButton.classList.contains(iconTheme) ? 'bx-moon' : 'bx-sun'

if (selectedTheme) {
  document.body.classList[selectedTheme === 'dark' ? 'add' : 'remove'](darkTheme)
  if(themeButton) {
      if (selectedTheme === 'dark') {
          themeButton.classList.remove('bx-moon');
          themeButton.classList.add('bx-sun');
      } else {
          themeButton.classList.remove('bx-sun');
          themeButton.classList.add('bx-moon');
      }
  }
}

if (themeButton) {
    themeButton.addEventListener('click', () => {
        themeButton.classList.add('rotate-icon');
        setTimeout(() => {
            document.body.classList.toggle(darkTheme)
            if(themeButton.classList.contains('bx-sun')) {
                themeButton.classList.remove('bx-sun');
                themeButton.classList.add('bx-moon');
            } else {
                themeButton.classList.remove('bx-moon');
                themeButton.classList.add('bx-sun');
            }
            localStorage.setItem('selected-theme', getCurrentTheme())
            localStorage.setItem('selected-icon', getCurrentIcon())
        }, 150); 
        setTimeout(() => { themeButton.classList.remove('rotate-icon'); }, 500);
    })
}

// Visitor Counter and Notification
function initVisitorCountDisplay() {
    const counterDisplay = document.getElementById("visitorCountDisplay");
    if (!counterDisplay) return;
    const statsRef = doc(db, "siteStats", "visitors");
    onSnapshot(statsRef, (docSnap) => {
        if (docSnap.exists()) counterDisplay.textContent = `${docSnap.data().count || 0} Visitors`;
        else counterDisplay.textContent = "0 Visitors";
    });
}
initVisitorCountDisplay();

async function handleVisitorSession(user) {
    const visitedKey = "has_visited_session";
    if (sessionStorage.getItem(visitedKey)) return; 
    sessionStorage.setItem(visitedKey, "true");

    const statsRef = doc(db, "siteStats", "visitors");
    try {
        await setDoc(statsRef, { count: increment(1) }, { merge: true });
        let senderName = "New Visitor";
        let senderUid = "anon_visitor";
        let senderPhoto = DEFAULT_PROFILE_IMG;

        if (user) {
            senderName = user.displayName || "Logged-in User";
            senderUid = user.uid;
            senderPhoto = getEffectivePhotoURL(user.photoURL);
        }

        await addDoc(collection(db, "notifications"), {
            type: 'visitor', senderUid: senderUid, senderName: senderName, senderPhoto: senderPhoto, timestamp: serverTimestamp(), readBy: []
        });
    } catch (error) { console.error("Error processing visitor:", error); }
}

// Online Users
async function initOnlinePresence() {
    const onlineDisplay = document.getElementById("onlineViewersDisplay");
    if (!onlineDisplay) return;
    const sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
    const userRef = doc(db, "activeSessions", sessionId);

    const sendHeartbeat = async () => {
        try { await setDoc(userRef, { lastSeen: Date.now(), userAgent: navigator.userAgent }, { merge: true });
        } catch (err) { console.error("Presence heartbeat failed:", err); }
    };

    await sendHeartbeat();
    setInterval(sendHeartbeat, 4000);
    window.addEventListener("beforeunload", () => { deleteDoc(userRef); });

    const sessionsRef = collection(db, "activeSessions");
    onSnapshot(sessionsRef, (snapshot) => {
        const now = Date.now();
        let activeCount = 0;
        const TIME_WINDOW = 60000; 
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.lastSeen) {
                const diff = now - data.lastSeen;
                if (diff < TIME_WINDOW && diff > -TIME_WINDOW) activeCount++;
            }
        });
        if (activeCount < 1) activeCount = 1;
        if (activeCount === 1) onlineDisplay.textContent = `1 Viewer (currently you)`;
        else onlineDisplay.textContent = `${activeCount} Viewers (currently you, and the others)`;
    });
}
initOnlinePresence();