let currentGame = null;
let gameInterval = null;

// Initialize admin interface
function initAdmin() {
    loadCurrentGame();
    switchTab('setup');
    startGameMonitoring();
}

// Switch between tabs
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab and activate button
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    // Refresh tab content
    refreshTabContent(tabName);
}

// Refresh content based on active tab
function refreshTabContent(tabName) {
    switch(tabName) {
        case 'setup':
            refreshGameSetup();
            break;
        case 'players':
            refreshPlayersList();
            break;
        case 'control':
            refreshGameControl();
            break;
        case 'results':
            refreshResults();
            break;
    }
}

// Create a new game
function createNewGame() {
    const gameName = document.getElementById('game-name').value || 'My Kahoot Game';
    const gamePin = generateGamePin();
    
    const newGame = {
        pin: gamePin,
        name: gameName,
        status: 'waiting',
        currentQuestion: 0,
        players: {},
        questions: [],
        createdAt: new Date().toISOString(),
        settings: {
            timeLimit: 20,
            points: {
                first: 10,
                second: 7,
                third: 5,
                participation: 2
            }
        }
    };
    
    // Save to localStorage
    const games = getGames();
    games[gamePin] = newGame;
    localStorage.setItem('kahootGames', JSON.stringify(games));
    
    currentGame = newGame;
    updateGameDisplay();
    
    alert(`Game created! Share this PIN with players: ${gamePin}`);
}

// Generate a 6-digit game PIN
function generateGamePin() {
    let pin;
    const games = getGames();
    
    do {
        pin = Math.floor(100000 + Math.random() * 900000).toString();
    } while (games[pin]);
    
    return pin;
}

// Load current game from localStorage
function loadCurrentGame() {
    const games = getGames();
    const gamePins = Object.keys(games);
    
    if (gamePins.length > 0) {
        // Load the most recent game
        const latestPin = gamePins.reduce((latest, pin) => {
            return games[pin].createdAt > games[latest].createdAt ? pin : latest;
        }, gamePins[0]);
        
        currentGame = games[latestPin];
        updateGameDisplay();
    }
}

// Update game display
function updateGameDisplay() {
    if (currentGame) {
        document.getElementById('current-game-pin').textContent = currentGame.pin;
        document.getElementById('game-info').innerHTML = `
            <p><strong>Game Name:</strong> ${currentGame.name}</p>
            <p><strong>Status:</strong> ${currentGame.status}</p>
            <p><strong>Players:</strong> ${Object.keys(currentGame.players).length}</p>
            <p><strong>Questions:</strong> ${currentGame.questions.length}</p>
        `;
    }
}

// Add a question to the current game
function addQuestion() {
    if (!currentGame) {
        alert('Please create a game first');
        return;
    }
    
    const questionText = document.getElementById('question-text').value;
    const option1 = document.getElementById('option1').value;
    const option2 = document.getElementById('option2').value;
    const option3 = document.getElementById('option3').value;
    const option4 = document.getElementById('option4').value;
    const correctAnswer = parseInt(document.getElementById('correct-answer').value);
    const timeLimit = parseInt(document.getElementById('time-limit').value) || 20;
    
    if (!questionText || !option1 || !option2 || !option3 || !option4) {
        alert('Please fill in all fields');
        return;
    }
    
    const question = {
        text: questionText,
        options: [option1, option2, option3, option4],
        correctAnswer: correctAnswer,
        timeLimit: timeLimit
    };
    
    currentGame.questions.push(question);
    saveGame();
    
    // Clear form
    document.getElementById('question-text').value = '';
    document.getElementById('option1').value = '';
    document.getElementById('option2').value = '';
    document.getElementById('option3').value = '';
    document.getElementById('option4').value = '';
    
    refreshQuestionsList();
    alert('Question added successfully!');
}

// Refresh questions list
function refreshQuestionsList() {
    const list = document.getElementById('questions-list');
    
    if (!currentGame || currentGame.questions.length === 0) {
        list.innerHTML = '<p class="no-data">No questions added yet</p>';
        return;
    }
    
    list.innerHTML = currentGame.questions.map((q, index) => `
        <div class="question-item">
            <h4>Question ${index + 1}</h4>
            <p><strong>Q:</strong> ${q.text}</p>
            <p><strong>Options:</strong> ${q.options.join(', ')}</p>
            <p><strong>Correct Answer:</strong> Option ${q.correctAnswer}</p>
            <p><strong>Time Limit:</strong> ${q.timeLimit} seconds</p>
            <button onclick="deleteQuestion(${index})" class="danger">Delete</button>
        </div>
    `).join('');
}

// Delete a question
function deleteQuestion(index) {
    if (confirm('Are you sure you want to delete this question?')) {
        currentGame.questions.splice(index, 1);
        saveGame();
        refreshQuestionsList();
    }
}

// Refresh players list
function refreshPlayersList() {
    const list = document.getElementById('players-list');
    
    if (!currentGame || Object.keys(currentGame.players).length === 0) {
        list.innerHTML = '<p class="no-data">No players have joined yet</p>';
        return;
    }
    
    list.innerHTML = Object.values(currentGame.players).map(player => `
        <div class="player-card">
            <h4>${player.name}</h4>
            <p>Score: ${player.score || 0} points</p>
            <p>Status: ${player.connected ? 'Online' : 'Offline'}</p>
        </div>
    `).join('');
}

// Start the game
function startGame() {
    if (!currentGame) {
        alert('Please create a game first');
        return;
    }
    
    if (currentGame.questions.length === 0) {
        alert('Please add at least one question before starting the game');
        return;
    }
    
    currentGame.status = 'playing';
    currentGame.currentQuestion = 0;
    currentGame.startedAt = new Date().toISOString();
    
    // Initialize player scores
    Object.keys(currentGame.players).forEach(playerId => {
        currentGame.players[playerId].score = 0;
        currentGame.players[playerId].answers = {};
    });
    
    saveGame();
    refreshGameControl();
    
    alert('Game started! Players can now begin answering questions.');
}

// Move to next question
function nextQuestion() {
    if (!currentGame || currentGame.status !== 'playing') return;
    
    if (currentGame.currentQuestion < currentGame.questions.length - 1) {
        currentGame.currentQuestion++;
        saveGame();
        refreshGameControl();
    } else {
        endGame();
    }
}

// End the game
function endGame() {
    if (!currentGame) return;
    
    currentGame.status = 'finished';
    currentGame.endedAt = new Date().toISOString();
    
    // Calculate final scores
    calculateFinalScores();
    
    saveGame();
    refreshGameControl();
    refreshResults();
    
    alert('Game ended! Final results are available.');
}

// Calculate final scores
function calculateFinalScores() {
    if (!currentGame) return;
    
    // Sort players by score
    const sortedPlayers = Object.entries(currentGame.players)
        .sort(([,a], [,b]) => (b.score || 0) - (a.score || 0));
    
    // Award bonus points for top positions
    sortedPlayers.forEach(([playerId, player], index) => {
        let bonus = 0;
        if (index === 0) bonus = currentGame.settings.points.first;
        else if (index === 1) bonus = currentGame.settings.points.second;
        else if (index === 2) bonus = currentGame.settings.points.third;
        else bonus = currentGame.settings.points.participation;
        
        player.score = (player.score || 0) + bonus;
        player.position = index + 1;
    });
    
    saveGame();
}

// Refresh game control interface
function refreshGameControl() {
    const startBtn = document.getElementById('start-btn');
    const nextBtn = document.getElementById('next-btn');
    const endBtn = document.getElementById('end-btn');
    const questionDisplay = document.getElementById('current-question-display');
    
    if (!currentGame) {
        startBtn.classList.remove('hidden');
        nextBtn.classList.add('hidden');
        endBtn.classList.add('hidden');
        questionDisplay.classList.add('hidden');
        return;
    }
    
    switch(currentGame.status) {
        case 'waiting':
            startBtn.classList.remove('hidden');
            nextBtn.classList.add('hidden');
            endBtn.classList.add('hidden');
            questionDisplay.classList.add('hidden');
            break;
            
        case 'playing':
            startBtn.classList.add('hidden');
            nextBtn.classList.remove('hidden');
            endBtn.classList.remove('hidden');
            questionDisplay.classList.remove('hidden');
            showCurrentQuestion();
            break;
            
        case 'finished':
            startBtn.classList.remove('hidden');
            nextBtn.classList.add('hidden');
            endBtn.classList.add('hidden');
            questionDisplay.classList.add('hidden');
            break;
    }
}

// Show current question
function showCurrentQuestion() {
    if (!currentGame || currentGame.status !== 'playing') return;
    
    const question = currentGame.questions[currentGame.currentQuestion];
    if (!question) return;
    
    document.getElementById('current-question-text').textContent = question.text;
    document.getElementById('question-timer').textContent = question.timeLimit;
    
    const optionsContainer = document.getElementById('current-options');
    optionsContainer.innerHTML = question.options.map((option, index) => `
        <div class="option">
            ${String.fromCharCode(65 + index)}. ${option}
            ${index + 1 === question.correctAnswer ? ' ✓' : ''}
        </div>
    `).join('');
}

// Refresh results
function refreshResults() {
    refreshLeaderboard();
    refreshQuestionResults();
}

// Refresh leaderboard
function refreshLeaderboard() {
    const leaderboard = document.getElementById('live-leaderboard');
    
    if (!currentGame || Object.keys(currentGame.players).length === 0) {
        leaderboard.innerHTML = '<p class="no-data">No players yet</p>';
        return;
    }
    
    // Sort players by score
    const sortedPlayers = Object.entries(currentGame.players)
        .sort(([,a], [,b]) => (b.score || 0) - (a.score || 0));
    
    leaderboard.innerHTML = sortedPlayers.map(([playerId, player], index) => `
        <div class="leaderboard-item ${index < 3 ? 'top-three' : ''}">
            <div>
                <span class="position">${index + 1}</span>
                <span>${player.name}</span>
            </div>
            <div>${player.score || 0} pts</div>
        </div>
    `).join('');
}

// Refresh question results
function refreshQuestionResults() {
    const resultsContainer = document.getElementById('question-results');
    
    if (!currentGame || currentGame.questions.length === 0) {
        resultsContainer.innerHTML = '<p class="no-data">No questions yet</p>';
        return;
    }
    
    resultsContainer.innerHTML = currentGame.questions.map((question, index) => {
        const correctAnswers = Object.values(currentGame.players).filter(player => 
            player.answers && player.answers[index] === question.correctAnswer
        ).length;
        
        const totalPlayers = Object.keys(currentGame.players).length;
        const percentage = totalPlayers > 0 ? Math.round((correctAnswers / totalPlayers) * 100) : 0;
        
        return `
            <div class="question-result">
                <h4>Question ${index + 1}</h4>
                <p>Correct Answers: ${correctAnswers}/${totalPlayers} (${percentage}%)</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

// Monitor game state changes
function startGameMonitoring() {
    gameInterval = setInterval(() => {
        if (currentGame) {
            const games = getGames();
            const updatedGame = games[currentGame.pin];
            
            if (updatedGame && JSON.stringify(updatedGame) !== JSON.stringify(currentGame)) {
                currentGame = updatedGame;
                updateGameDisplay();
                refreshTabContent(getActiveTab());
            }
        }
    }, 2000);
}

// Get active tab name
function getActiveTab() {
    const activeTab = document.querySelector('.tab-content.active');
    return activeTab ? activeTab.id : 'setup';
}

// Get all games from localStorage
function getGames() {
    return JSON.parse(localStorage.getItem('kahootGames') || '{}');
}

// Save current game
function saveGame() {
    const games = getGames();
    games[currentGame.pin] = currentGame;
    localStorage.setItem('kahootGames', JSON.stringify(games));
}

// Refresh game setup tab
function refreshGameSetup() {
    updateGameDisplay();
    refreshQuestionsList();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initAdmin);