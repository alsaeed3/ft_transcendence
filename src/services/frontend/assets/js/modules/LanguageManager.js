export class LanguageManager {
	static translations = {
		en: {
				welcome: "Welcome",
				login: "Login",
				register: "Register",
				username: "Username",
				password: "Password",
				email: "Email",
				createAccount: "Create Account",
				backToLogin: "Back to Login",
				loginWith42: "Login with 42",
				or: "or",
				dontHaveAccount: "Don't have an account?",
				playAgainstPlayer: "Play Against Player",
				playAgainstAI: "Play Against AI",
				createTournament: "Create Tournament",
				territoryBattle: "3-Player Territory Battle",
				pongBattle: "4-Player Pong Battle",
				playerStats: "Player Stats",
				recentMatches: "Recent Matches",
				matchWins: "Match Wins",
				tournamentWins: "Tournament Wins",
				totalMatches: "Total Matches",
				totalTournaments: "Total Tournaments",
				updateProfile: "Update Profile",
				friends: "Friends",
				users: "Users",
				logout: "Logout",
				twoFASection: "Two-Factor Authentication",
				usersList: "Users List",
				newPasswordOptional: "New Password (optional)",
				currentAvatar: "Current Avatar",
				changeAvatar: "Change Avatar",
				confirmPassword: "Confirm Password",
				enableDisable2FA: "Enable/Disable Two-Factor Authentication",
				backToMain: "Back to Main",
				nautilusPongGame: "Nautilus Pong",
				nautilusPong: "Nautilus Pong",
				actions: "Actions",
				status: "Status",
				friendsList: "Friend List",
				yourFriends: "Your Friends",
				addFriend: "Add Friend",
				match: "Match",
				winner: "Winner",
				vs: "vs",
				score: "Score",
				online: "Online",
				offline: "Offline",
				block: "Block",
				unblock: "Unblock",
				blockedByUser: "Blocked by user",
				chat: "Chat",
				removeFriend: "Remove Friend",
				enterUsername: "Enter username",
				sendFriendRequest: "Send Friend Request",
				confirmRemoveFriend: "Are you sure you want to remove {username} from your friends list?",
				enterEmail: "Enter your email",
				newPassword: "New Password",
				passwordHint: "Leave blank to keep current password",
				twoFactorAuth: "Two-Factor Authentication",
				profileUpdateSuccess: "Profile updated successfully!",
				profileUpdateError: "Failed to update profile",
				twoFactorEnabled: "Two-Factor Authentication is enabled",
				twoFactorDisabled: "Two-Factor Authentication is disabled",
				twoFactorToggleSuccess: "Two-Factor Authentication status updated",
				twoFactorToggleError: "Failed to update Two-Factor Authentication status",
				twoFactor42Message: "Your 2FA settings are managed by your 42 School account",
				enterCurrentPassword: "Enter your current password",
				chooseFile: "Choose File",
				noFileChosen: "No file chosen",
				browseFiles: "Browse Files",
				noFriendsYet: "No friends added yet",
				territoryGameTitle: "Color Territory Battle",
				redPlayer: "Red",
				bluePlayer: "Blue",
				greenPlayer: "Green",
				playerControls: "Controls:",
				redControls: "Red Player: WASD",
				blueControls: "Blue Player: IJKL",
				greenControls: "Green Player: Arrow Keys",
				territoryInstructions: "Capture territory by moving around!",
				playerWins: "{0} Player Wins!",
				player2Setup: "Player 2 Setup",
				player2Username: "Player 2 Username",
				startGame: "Start Game",
				cancel: "Cancel",
				championshipMatch: "Championship Match",
				next: "Next",
				versus: "VS",
				winnerAdvances: "Winner advances to play against {0}",
				tournamentSetup: "Tournament Setup",
				numberOfPlayers: "Number of Players",
				players4: "4 Players",
				players8: "8 Players",
				player: "Player",
				playerYou: "Player 1 (You)",
				startTournament: "Start Tournament",
				playerNicknameError: "All player nicknames are required",
				nicknameLengthError: "Nicknames must be 8 characters or less",
				nicknameCharError: "Nicknames can only contain letters and numbers",
				uniqueNicknameError: "Each player must have a unique nickname"
		},
		ar: {
				welcome: "مرحباً",
				login: "تسجيل الدخول",
				register: "تسجيل",
				username: "اسم المستخدم",
				password: "كلمة المرور",
				email: "البريد الإلكتروني",
				createAccount: "إنشاء حساب",
				backToLogin: "العودة إلى تسجيل الدخول",
				loginWith42: "تسجيل الدخول باستخدام 42",
				or: "أو",
				dontHaveAccount: "ليس لديك حساب؟",
				playAgainstPlayer: "اللعب ضد لاعب",
				playAgainstAI: "اللعب ضد الذكاء الاصطناعي",
				createTournament: "إنشاء بطولة",
				territoryBattle: "معركة الأراضي ثلاثية اللاعبين",
				pongBattle: "معركة بونج رباعية اللاعبين",
				playerStats: "إحصائيات اللاعب",
				recentMatches: "المباريات الأخيرة",
				matchWins: "الفوز بالمباريات",
				tournamentWins: "الفوز بالبطولات",
				totalMatches: "إجمالي المباريات",
				totalTournaments: "إجمالي البطولات",
				updateProfile: "تحديث الملف الشخصي",
				friends: "الأصدقاء",
				users: "المستخدمون",
				logout: "تسجيل الخروج",
				twoFASection: "المصادقة الثنائية",
				usersList: "قائمة المستخدمين",
				newPasswordOptional: "كلمة المرور الجديدة (اختياري)",
				currentAvatar: "الصورة الرمزية الحالية",
				changeAvatar: "تغيير الصورة الرمزية",
				confirmPassword: "تأكيد كلمة المرور",
				enableDisable2FA: "تمكين/تعطيل المصادقة الثنائية",
				backToMain: "العودة للرئيسية",
				nautilusPongGame: "نوتيلوس بونج",
				nautilusPong: "نوتيلوس بونج",
				actions: "الإجراءات",
				status: "الحالة",
				friendsList: "قائمة الأصدقاء",
				yourFriends: "أصدقاؤك",
				addFriend: "إضافة صديق",
				match: "مباراة",
				winner: "الفائز",
				vs: "ضد",
				score: "النتيجة",
				online: "متصل",
				offline: "غير متصل",
				block: "حظر",
				unblock: "إلغاء الحظر",
				blockedByUser: "محظور من قبل المستخدم",
				chat: "محادثة",
				removeFriend: "إزالة الصديق",
				enterUsername: "أدخل اسم المستخدم",
				sendFriendRequest: "إرسال طلب صداقة",
				confirmRemoveFriend: "هل أنت متأكد أنك تريد إزالة المستخدم {username} من قائمة أصدقائك؟",
				enterEmail: "أدخل بريدك الإلكتروني",
				newPassword: "كلمة المرور الجديدة",
				passwordHint: "اتركه فارغاً للاحتفاظ بكلمة المرور الحالية",
				twoFactorAuth: "المصادقة الثنائية",
				profileUpdateSuccess: "تم تحديث الملف الشخصي بنجاح!",
				profileUpdateError: "فشل تحديث الملف الشخصي",
				twoFactorEnabled: "المصادقة الثنائية مفعلة",
				twoFactorDisabled: "المصادقة الثنائية معطلة",
				twoFactorToggleSuccess: "تم تحديث حالة المصادقة الثنائية",
				twoFactorToggleError: "فشل تحديث حالة المصادقة الثنائية",
				twoFactor42Message: "يتم إدارة إعدادات المصادقة الثنائية من خلال حساب مدرسة 42 الخاص بك",
				enterCurrentPassword: "أدخل كلمة المرور الحالية",
				chooseFile: "اختيار ملف",
				noFileChosen: "لم يتم اختيار ملف",
				browseFiles: "تصفح الملفات",
				noFriendsYet: "لم تتم إضافة أصدقاء بعد",
				territoryGameTitle: "معركة المناطق الملونة",
				redPlayer: "الأحمر",
				bluePlayer: "الأزرق",
				greenPlayer: "الأخضر",
				playerControls: "مفاتيح التحكم:",
				redControls: "اللاعب الأحمر: WASD",
				blueControls: "اللاعب الأزرق: IJKL",
				greenControls: "اللاعب الأخضر: مفاتيح الأسهم",
				territoryInstructions: "استولِ على المناطق بالتحرك حولها!",
				playerWins: "فاز اللاعب {0}!",
				player2Setup: "إعداد اللاعب 2",
				player2Username: "اسم اللاعب 2",
				startGame: "ابدأ اللعبة",
				cancel: "إلغاء",
				championshipMatch: "مباراة البطولة",
				next: "التالي",
				versus: "ضد",
				winnerAdvances: "الفائز يتقدم للعب ضد {0}",
				tournamentSetup: "إعداد البطولة",
				numberOfPlayers: "عدد اللاعبين",
				players4: "4 لاعبين",
				players8: "8 لاعبين",
				player: "اللاعب",
				playerYou: "اللاعب 1 (أنت)",
				startTournament: "بدأ البطولة",
				playerNicknameError: "جميع اسماء اللاعبين مطلوبة",
				nicknameLengthError: "يجب أن تكون أسماء اللاعبين 8 أحرف أو أقل",
				nicknameCharError: "يمكن أن تحتوي أسماء اللاعبين على حروف وأرقام فقط",
				uniqueNicknameError: "يجب أن يكون لكل لاعب اسم مميز"
		},
		ml: {
				welcome: "സ്വാഗതം",
				login: "ലോഗിൻ",
				register: "രജിസ്റ്റർ",
				username: "ഉപയോക്തൃനാമം",
				password: "പാസ്വേഡ്",
				email: "ഇമെയിൽ",
				createAccount: "അക്കൗണ്ട് സൃഷ്ടിക്കുക",
				backToLogin: "ലോഗിനിലേക്ക് മടങ്ങുക",
				loginWith42: "42 ഉപയോഗിച്ച് ലോഗിൻ ചെയ്യുക",
				or: "അല്ലെങ്കിൽ",
				dontHaveAccount: "അക്കൗണ്ട് ഇല്ലേ?",
				playAgainstPlayer: "കളിക്കാരനെതിരെ കളിക്കുക",
				playAgainstAI: "AI നെതിരെ കളിക്കുക",
				createTournament: "ടൂർണമെന്റ് സൃഷ്ടിക്കുക",
				territoryBattle: "3-പ്ലേയർ ടെറിട്ടറി ബാറ്റിൽ",
				pongBattle: "4-പ്ലേയർ പോങ് ബാറ്റിൽ",
				playerStats: "കളിക്കാരന്റെ സ്ഥിതിവിവരക്കണക്കുകൾ",
				recentMatches: "സമീപകാല മത്സരങ്ങൾ",
				matchWins: "മത്സര വിജയങ്ങൾ",
				tournamentWins: "ടൂർണമെന്റ് വിജയങ്ങൾ",
				totalMatches: "ആകെ മത്സരങ്ങൾ",
				totalTournaments: "ആകെ ടൂർണമെന്റുകൾ",
				updateProfile: "പ്രൊഫൈൽ അപ്ഡേറ്റ് ചെയ്യുക",
				friends: "സുഹൃത്തുക്കൾ",
				users: "ഉപയോക്താക്കൾ",
				logout: "ലോഗൗട്ട്",
				twoFASection: "ടു-ഫാക്ടർ ഓഥന്റിക്കേഷൻ",
				usersList: "ഉപയോക്താക്കളുടെ പട്ടിക",
				newPasswordOptional: "പുതിയ പാസ്വേഡ് (ഓപ്ഷണൽ)",
				currentAvatar: "നിലവിലെ അവതാരം",
				changeAvatar: "അവതാരം മാറ്റുക",
				confirmPassword: "പാസ്വേഡ് സ്ഥിരീകരിക്കുക",
				enableDisable2FA: "ടു-ഫാക്ടർ ഓഥന്റിക്കേഷൻ സജ്ജീകരിക്കുക/അടയ്ക്കുക",
				backToMain: "മെയിനിലേക്ക് മടങ്ങുക",
				nautilusPongGame: "നൗട്ടിലസ് പോങ്",
				nautilusPong: "നൗട്ടിലസ് പോങ്",
				actions: "നടപടികൾ",
				status: "സ്ഥിതി",
				friendsList: "സുഹൃത്തുക്കളുടെ പട്ടിക",
				yourFriends: "നിന്റെ സുഹൃത്തുക്കൾ",
				addFriend: "സുഹൃത്താക്കുക",
				match: "മത്സരം",
				winner: "വിജയി",
				vs: "വേഴ്സസ്",
				score: "സ്കോർ",
				online: "ഓൺലൈൻ",
				offline: "ഓഫ്‌ലൈൻ",
				block: "ബ്ലോക്ക്",
				unblock: "അൺബ്ലോക്ക്",
				blockedByUser: "ഉപയോക്താവ് ബ്ലോക്ക് ചെയ്തു",
				chat: "ചാറ്റ്",
				removeFriend: "അടയ്ക്കുക",
				enterUsername: "ഉപയോക്താനാമം നൽകുക",
				sendFriendRequest: "സുഹൃത്താക്കുക",
				confirmRemoveFriend: "നിന്റെ സുഹൃത്തുക്കളിൽ നിന്ന് {username} അടയ്ക്കുക്കോ?",
				enterEmail: "നിങ്ങളുടെ ഇമെയിൽ നൽകുക",
				newPassword: "പുതിയ പാസ്‌വേഡ്",
				passwordHint: "നിലവിലെ പാസ്‌വേഡ് നിലനിർത്താൻ ഒഴിഞ്ഞതായി വിടുക",
				twoFactorAuth: "ടു-ഫാക്ടർ ഓതന്റിക്കേഷൻ",
				profileUpdateSuccess: "പ്രൊഫൈൽ വിജയകരമായി അപ്ഡേറ്റ് ചെയ്തു!",
				profileUpdateError: "പ്രൊഫൈൽ അപ്ഡേറ്റ് ചെയ്യുന്നതിൽ പരാജയപ്പെട്ടു",
				twoFactorEnabled: "ടു-ഫാക്ടർ ഓതന്റിക്കേഷൻ പ്രവർത്തനക്ഷമമാണ്",
				twoFactorDisabled: "ടു-ഫാക്ടർ ഓതന്റിക്കേഷൻ പ്രവർത്തനരഹിതമാണ്",
				twoFactorToggleSuccess: "ടു-ഫാക്ടർ ഓതന്റിക്കേഷൻ സ്റ്റാറ്റസ് അപ്ഡേറ്റ് ചെയ്തു",
				twoFactorToggleError: "ടു-ഫാക്ടർ ഓതന്റിക്കേഷൻ സ്റ്റാറ്റസ് അപ്ഡേറ്റ് ചെയ്യുന്നതിൽ പരാജയപ്പെട്ടു",
				twoFactor42Message: "നിങ്ങളുടെ 2FA ക്രമീകരണങ്ങൾ നിങ്ങളുടെ 42 സ്കൂൾ അക്കൗണ്ട് വഴി കൈകാര്യം ചെയ്യുന്നു",
				enterCurrentPassword: "നിലവിലെ പാസ്‌വേഡ് നൽകുക",
				chooseFile: "ഫയൽ തിരഞ്ഞെടുക്കുക",
				noFileChosen: "ഫയലൊന്നും തിരഞ്ഞെടുത്തിട്ടില്ല",
				browseFiles: "ഫയലുകൾ ബ്രൗസ് ചെയ്യുക",
				noFriendsYet: "സുഹൃത്തുക്കളൊന്നും ചേർത്തിട്ടില്ല",
				territoryGameTitle: "കളർ ടെറിട്ടറി ബാറ്റിൽ",
				redPlayer: "ചുവപ്പ്",
				bluePlayer: "നീല",
				greenPlayer: "പച്ച",
				playerControls: "നിയന്ത്രണങ്ങൾ:",
				redControls: "ചുവപ്പ് കളിക്കാരൻ: WASD",
				blueControls: "നീല കളിക്കാരൻ: IJKL",
				greenControls: "പച്ച കളിക്കാരൻ: അമ്പ് കീകൾ",
				territoryInstructions: "ചുറ്റും നീങ്ങി പ്രദേശം പിടിച്ചെടുക്കൂ!",
				playerWins: "{0} കളിക്കാരൻ ജയിച്ചു!",
				player2Setup: "കളിക്കാരൻ 2 സജ്ജീകരണം",
				player2Username: "കളിക്കാരൻ 2 ഉപയോക്തൃനാമം",
				startGame: "കളി തുടങ്ങുക",
				cancel: "റദ്ദാക്കുക",
				championshipMatch: "ചാമ്പ്യൻഷിപ്പ് മത്സരം",
				next: "അടുത്തത്",
				versus: "VS",
				winnerAdvances: "വിജയി {0}-നെതിരെ കളിക്കും",
				tournamentSetup: "ടൂർണമെന്റ് സൃഷ്ടിക്കുക",
				numberOfPlayers: "ലായിപ്പ്കൾ എണ്ണം",
				players4: "4 ലായിപ്പ്കൾ",
				players8: "8 ലായിപ്പ്കൾ",
				player: "ലായിപ്പ്",
				playerYou: "ലായിപ്പ് 1 (നിങ്ങളോ)",
				startTournament: "ടൂർണമെന്റ് തുടങ്ങുക",
				playerNicknameError: "ലായിപ്പ്കൾക്ക് പനാമങ്ങൾ ആവശ്യമാണ്",
				nicknameLengthError: "പനാമങ്ങൾ 8 അക്ഷരങ്ങളോ കുറയുന്നതായിരിക്കണം",
				nicknameCharError: "പനാമങ്ങൾ അക്ഷരങ്ങളോ സംഖ്യങ്ങളോ ഉള്ളിരിക്കണം",
				uniqueNicknameError: "ഒരു ലായിപ്പ്ക്ക് പനാമം അന്ന്യമായിരിക്കണം"
		}
	};

	static currentLanguage = localStorage.getItem('language') || 'en';

	static initialize() {
		// Set initial language
		this.setLanguage(this.currentLanguage);
		
		// Add event listener for language selection
		document.getElementById('language-select')?.addEventListener('change', (e) => {
				this.setLanguage(e.target.value);
		});

		// Set initial dropdown value
		const select = document.getElementById('language-select');
		if (select) {
				select.value = this.currentLanguage;
		}
	}

	static setLanguage(lang) {
		this.currentLanguage = lang;
		localStorage.setItem('language', lang);
		
		// Handle RTL languages
		document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
		document.body.classList.toggle('rtl', lang === 'ar');
		
		// Update all translatable elements
		this.updateContent();

		// Emit custom event for dynamic content updates
		window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
	}

	static updateContent() {
		// Update regular translations
		document.querySelectorAll('[data-i18n]').forEach(element => {
			const key = element.getAttribute('data-i18n');
			if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
				element.placeholder = this.getTranslation(key);
			} else if (element.tagName === 'BUTTON') {
				// Special handling for buttons to ensure they get translated
				element.textContent = this.getTranslation(key);
			} else {
				element.textContent = this.getTranslation(key);
			}
		});

		// Update file inputs
		document.querySelectorAll('input[type="file"]').forEach(input => {
			// Create a wrapper div if it doesn't exist
			let wrapper = input.parentElement;
			if (!wrapper.classList.contains('file-input-wrapper')) {
				wrapper = document.createElement('div');
				wrapper.className = 'file-input-wrapper position-relative';
				input.parentNode.insertBefore(wrapper, input);
				wrapper.appendChild(input);
			}

			// Create or update the custom button
			let customButton = wrapper.querySelector('.custom-file-button');
			if (!customButton) {
				customButton = document.createElement('button');
				customButton.type = 'button';
				customButton.className = 'custom-file-button btn btn-secondary position-absolute';
				customButton.style.right = '0';
				customButton.style.top = '0';
				wrapper.appendChild(customButton);
			}
			customButton.textContent = this.getTranslation('chooseFile');

			// Create or update the filename display
			let filenameDisplay = wrapper.querySelector('.filename-display');
			if (!filenameDisplay) {
				filenameDisplay = document.createElement('span');
				filenameDisplay.className = 'filename-display form-control';
				filenameDisplay.style.paddingRight = '100px'; // Make room for the button
				wrapper.appendChild(filenameDisplay);
			}
			filenameDisplay.textContent = input.files[0]?.name || this.getTranslation('noFileChosen');

			// Hide the original input but keep it functional
			input.style.opacity = '0';
			input.style.position = 'absolute';
			input.style.top = '0';
			input.style.right = '0';
			input.style.width = '100%';
			input.style.height = '100%';
			input.style.cursor = 'pointer';

			// Update click handler
			customButton.onclick = () => input.click();

			// Update change handler
			input.onchange = () => {
				filenameDisplay.textContent = input.files[0]?.name || this.getTranslation('noFileChosen');
			};
		});
	}

	static getTranslation(key) {
		const translation = this.translations[this.currentLanguage][key] || this.translations['en'][key];
		return translation || key;
	}

	// Add method to handle dynamic content
	static translateDynamicContent(content, type) {
		switch (type) {
			case 'matchHistory':
					return this.translateMatchHistory(content);
			case 'userProfile':
					return this.translateUserProfile(content);
			default:
					return content;
		}
	}

	// Add method to handle file input translations
	static updateFileInputs() {
		document.querySelectorAll('input[type="file"]').forEach(input => {
			const label = input.nextElementSibling;
			if (label && label.classList.contains('form-file-text')) {
				label.textContent = input.files.length > 0 ? 
					input.files[0].name : 
					this.getTranslation('noFileChosen');
			}
			const browseButton = input.parentElement?.querySelector('.form-file-button');
			if (browseButton) {
				browseButton.textContent = this.getTranslation('chooseFile');
			}
		});
	}
}