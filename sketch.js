// Global variables
let boxes = [];
let activeBox = null;
let points = 10;
let scoreDisplay;
let autoTypers = [];
let sentenceModifier = 1.25; // Global sentence modifier
const spawnAreaWidth = 300;
const spawnAreaHeight = 700;
let activeAutoTyper = null;
let autoTyperInfo; // We'll initialize this in setup()


// Sample dictionary for sentences
const dictionary = [
    "The quick brown fox jumps over the lazy dog",
    "Hello world",
    "Typing is fun",
    "Grok helps me code",
    "Random text here",
    "Snap those boxes",
    "Click and type",
];

function setup() {

    // Create a centered 1200x800 canvas
    let cnv = createCanvas(1200, 800);
    cnv.id("gameCanvas");
    cnv.style("position", "absolute");
    cnv.style("left", "50%");
    cnv.style("top", "50%");
    cnv.style("transform", "translate(-50%, -50%)");
    loadGameState();

    // Create one initial sentence TypingBox as a sample
   // if (boxes.length === 0) {
    //    boxes.push(new TypingBox(0, 0, 280, 150, getRandomPrompt(), "sentence"));
   // }
    // Get the score display and update it
    scoreDisplay = select("#scoreDisplay");
    updateScoreDisplay();
    let flatIncreaseBtn = select("#flatIncreaseBtn");
    if (flatIncreaseBtn) {
        flatIncreaseBtn.mousePressed(buyFlatIncrease);
    }
    let resetGameBtn = select("#resetGameBtn");
    if (resetGameBtn) {
        resetGameBtn.mousePressed(resetGameState);
    }

    let percentIncreaseBtn = select("#percentIncreaseBtn");
    if (percentIncreaseBtn) {
        percentIncreaseBtn.mousePressed(buyPercentIncrease);
    }
    // Button for adding a sentence
    let addSentenceBtn = select("#addSentenceBtn");
    if (addSentenceBtn) {
        addSentenceBtn.mousePressed(addSentence);
    }

    // Button for adding a letter
    let addLetterBtn = select("#addLetterBtn");
    if (addLetterBtn) {
        addLetterBtn.mousePressed(addLetter);
    }

    // Button for buying an auto typer
    let buyAutoTyperBtn = select("#buyAutoTyperBtn");
    if (buyAutoTyperBtn) {
        buyAutoTyperBtn.mousePressed(buyAutoTyper);
    }
    autoTyperInfo = select("#autoTyperInfo");
    updateAutoTyperInfo(); // 
    let upgradeATBtn = select("#upgradeATBtn");
    if (upgradeATBtn) {
        upgradeATBtn.mousePressed(upgradeActiveAutoTyper);
    }
    updateStatMeter();

    // Disable the browser's default context menu
    document.oncontextmenu = () => false;
}
function resetGameState() {
    if (confirm("Are you sure you want to reset the game? This cannot be undone.")) {
        localStorage.removeItem("typingClickerState");
        window.location.reload();
    }
}
function saveGameState() {
    const state = {
        points: points,
        sentenceModifier: sentenceModifier,
        boxes: boxes.map(b => ({
            x: b.x,
            y: b.y,
            spawnX: b.spawnX,
            spawnY: b.spawnY,
            w: b.w,
            h: b.h,
            prompt: b.prompt,
            type: b.type,
            currentIndex: b.currentIndex,
            finished: b.finished,
            autoTyperActive: b.autoTyperActive
        })),
        autoTypers: autoTypers.map(at => ({
            x: at.x,
            y: at.y,
            level: at.level,
            wordPerMinute: at.wordPerMinute,
            multiplier: at.multiplier,
            typingInterval: at.typingInterval,
            // If attached, store the index of the attached box; otherwise -1.
            attachedIndex: at.attachedBox ? boxes.indexOf(at.attachedBox) : -1
        }))
    };
    localStorage.setItem("typingClickerState", JSON.stringify(state));
}
function loadGameState() {
    const savedState = localStorage.getItem("typingClickerState");
    if (!savedState) return; // No saved state available.
    try {
        const state = JSON.parse(savedState);
        points = (state.points !== undefined) ? state.points : 0;
        sentenceModifier = (state.sentenceModifier !== undefined) ? state.sentenceModifier : 1.25;

        // Recreate boxes.
        boxes = state.boxes.map(bData => {
            const b = new TypingBox(bData.x, bData.y, bData.w, bData.h, bData.prompt, bData.type);
            b.spawnX = bData.spawnX;
            b.spawnY = bData.spawnY;
            b.currentIndex = bData.currentIndex;
            b.finished = bData.finished;
            b.autoTyperActive = bData.autoTyperActive;
            return b;
        });

        // Recreate auto typers.
        autoTypers = state.autoTypers.map(atData => {
            const at = new AutoTyper(atData.x, atData.y);
            at.level = atData.level;
            at.wordPerMinute = atData.wordPerMinute;
            at.multiplier = atData.multiplier;
            at.typingInterval = atData.typingInterval;
            // If attachedIndex is valid, attach the auto typer to the corresponding box.
            at.attachedBox = (atData.attachedIndex >= 0 && atData.attachedIndex < boxes.length) ? boxes[atData.attachedIndex] : null;
            return at;
        });
    } catch (e) {
        console.error("Error loading game state: ", e);
    }
}
function getRandomPrompt() {
    return dictionary[Math.floor(Math.random() * dictionary.length)];
}
function getRandomLetter() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return letters.charAt(Math.floor(Math.random() * letters.length));
}
function draw() {
    background(230);

    // Draw spawn area on the left (300x300)
    noStroke();
    fill(220);
    rect(0, 0, spawnAreaWidth, spawnAreaHeight);

    // Draw auto typer area (bottom 100px)
    fill(200);
    rect(0, height - 100, width, 100);

    // Draw boxes and auto typers
    for (let box of boxes) {
        box.update();
        box.display();
    }
    for (let at of autoTypers) {
        at.update();
        at.display();
    }
}
function mousePressed() {
    if (mouseButton === RIGHT) {
        handleRightClick(mouseX, mouseY);
    } else if (mouseButton === LEFT) {
        // First check if the click is on any auto typer.
        let clickedOnAutoTyper = false;
        for (let at of autoTypers) {
            if (dist(mouseX, mouseY, at.x, at.y) < 15) {
                clickedOnAutoTyper = true;
                at.pressed(); // Let the auto typer handle its own pressed logic.
                break;
            }
        }
        // If the click was not on an auto typer, remove the active auto typer (if any)
        if (!clickedOnAutoTyper && activeAutoTyper) {
            // Remove the active auto typer from the array
            autoTypers = autoTypers.filter(at => at !== activeAutoTyper);
            activeAutoTyper = null;
            updateAutoTyperInfo(); // This hides the info panel.
        }
        // Also allow boxes to be dragged.
        for (let box of boxes) {
            box.pressed();
        }
    }
}
function mouseReleased() {
    if (mouseButton === LEFT) {
        for (let box of boxes) {
            box.released();
        }
        for (let at of autoTypers) {
            at.released();
        }
    }
}
function keyPressed() {
    if (activeBox && !activeBox.inSpawnArea && activeBox.currentIndex < activeBox.prompt.length) {
        let expected = activeBox.prompt.charAt(activeBox.currentIndex);
        if (key === expected) {
            activeBox.currentIndex++;
            if (activeBox.currentIndex === activeBox.prompt.length && !activeBox.finished) {
                activeBox.finished = true;
                let reward = 0;
                if (activeBox.type === "sentence") {
                    reward = activeBox.prompt.length * sentenceModifier;
                } else if (activeBox.type === "letter") {
                    reward = 1;
                }
                points += reward;
                updateScoreDisplay();
                activeBox.reset();
            }
        }
    }
    return false;
}
function handleRightClick(x, y) {
    activeBox = null;
    for (let box of boxes) {
        if (x > box.x && x < box.x + box.w && y > box.y && y < box.y + box.h) {
            activeBox = box;
            box.selected = true;
        } else {
            box.selected = false;
        }
    }
    return false;
}
function updateScoreDisplay() {
    scoreDisplay.html("Points: " + points);
    saveGameState();
}
function updateStatMeter() {
    let statMeter = select("#statMeter");
    if (statMeter) {
        statMeter.html("Sentence Modifier: " + sentenceModifier.toFixed(2));
    }
}
function addLetter() {
    if (points < 1) {
        alert("Not enough points to add a Letter!");
        return;
    }
    points -= 1;
    updateScoreDisplay();

    const boxW = 50;
    const boxH = 50;
    const gap = 10;

    let foundSpot = false;
    let spawnX = 0;
    let spawnY = 0;

    // Scan the entire spawn area for a spot that can fit the letter.
    for (let y = 0; y <= spawnAreaHeight - boxH; y += gap) {
        for (let x = 0; x <= spawnAreaWidth - boxW; x += gap) {
            if (boxIsValidForSpawn(x, y, boxW, boxH)) {
                spawnX = x;
                spawnY = y;
                foundSpot = true;
                break;
            }
        }
        if (foundSpot) break;
    }

    if (!foundSpot) {
        alert("No room in spawn area for a Letter!");
        return;
    }

    let newBox = new TypingBox(spawnX, spawnY, boxW, boxH, getRandomLetter(), "letter");
    boxes.push(newBox);
}
function addSentence() {
    if (points < 25) {
        alert("Not enough points to add a Sentence!");
        return;
    }
    points -= 25;
    updateScoreDisplay();

    const boxW = 295;
    const boxH = 150;
    const gap = 10;

    let foundSpot = false;
    let spawnX = 0;
    let spawnY = 0;

    // Scan the entire spawn area for a spot that can fit the sentence.
    for (let y = 0; y <= spawnAreaHeight - boxH; y += gap) {
        for (let x = 0; x <= spawnAreaWidth - boxW; x += gap) {
            if (boxIsValidForSpawn(x, y, boxW, boxH)) {
                spawnX = x;
                spawnY = y;
                foundSpot = true;
                break;
            }
        }
        if (foundSpot) break;
    }

    if (!foundSpot) {
        alert("No room in spawn area for a Sentence!");
        return;
    }

    let newBox = new TypingBox(spawnX, spawnY, boxW, boxH, getRandomPrompt(), "sentence");
    boxes.push(newBox);
}
function buyAutoTyper() {
    if (points >= 10) {
        points -= 10;
        updateScoreDisplay();
        let unattachedCount = autoTypers.filter(at => !at.attachedBox).length;
        let gap = 40;
        let newX = 50 + unattachedCount * gap;
        // Spawn auto typers near the bottom (e.g., last 100 pixels are reserved)
        let newY = height - 30;
        autoTypers.push(new AutoTyper(newX, newY));
    } else {
        alert("Not enough points to buy an AutoTyper!");
    }
}
function buyFlatIncrease() {
    if (points >= 10) {
        points -= 10;
        sentenceModifier += 0.01;
        updateScoreDisplay();
        updateStatMeter();
    } else {
        alert("Not enough points for a Flat Increase!");
    }
}
function buyPercentIncrease() {
    if (points >= 100) {
        points -= 100;
        // Increase the modifier by 1% (multiply by 1.01)
        sentenceModifier *= 1.01;
        updateScoreDisplay();
        updateStatMeter();
    } else {
        alert("Not enough points for a Percent Increase!");
    }
}
function rectOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}
function boxIsValidForSpawn(x, y, w, h) {
    // Must be entirely within the spawn area.
    if (x < 0 || x + w > spawnAreaWidth) return false;
    if (y < 0 || y + h > spawnAreaHeight) return false;

    // Check that it does not overlap any other box already in the spawn area.
    for (let b of boxes) {
        // Only consider boxes that are currently in the spawn area.
        if (b.x < spawnAreaWidth && b.y < spawnAreaHeight && rectOverlap(x, y, w, h, b.x, b.y, b.w, b.h)) {
            return false;
        }
    }
    return true;
}
function updateAutoTyperInfo() {
    if (activeAutoTyper) {
        // Make the info panel visible.
        autoTyperInfo.style("display", "block");
        select("#atWPM").html("WPM: " + activeAutoTyper.wordPerMinute);
        select("#atMultiplier").html("Multiplier: " + activeAutoTyper.multiplier.toFixed(2));
        select("#atLevel").html("Level: " + activeAutoTyper.level);
    } else {
        // Hide the info panel when no auto typer is selected.
        autoTyperInfo.style("display", "none");
    }
}
function upgradeActiveAutoTyper() {
    if (!activeAutoTyper) {
        alert("No Auto Typer selected!");
        return;
    }
    // Increase level by 1
    activeAutoTyper.level++;
    // Increase stats; you can tweak these values as desired.
    activeAutoTyper.wordPerMinute += 10;  // Increase WPM by 10
    activeAutoTyper.multiplier += 0.1;      // Increase multiplier by 0.1
    // Optionally, you could also decrease its typing interval if you want it to type faster.
    // activeAutoTyper.typingInterval = max(activeAutoTyper.typingInterval - 50, 100);

    updateAutoTyperInfo();
    saveGameState();
}

class TypingBox {
    constructor(x, y, w, h, prompt, type = "sentence") {
        this.x = x;
        this.y = y;
        this.spawnX = x;  // Save the spawn location
        this.spawnY = y;
        this.w = w;
        this.h = h;
        this.prompt = prompt;
        this.type = type;
        this.currentIndex = 0;
        this.finished = false;
        this.selected = false;
        this.dragging = false;
        this.offsetX = 0;
        this.offsetY = 0;
        this.promptPadding = 10;
        this.maxPromptHeight = this.h - this.promptPadding * 2;
        this.originalX = x;
        this.originalY = y;
        this.autoTyperActive = false;
    }
    getWrappedLines(availableWidth) {
        textSize(16);
        let lines = [];
        let currentLine = "";
        let startIdx = 0;
        for (let i = 0; i < this.prompt.length; i++) {
            let ch = this.prompt.charAt(i);
            let testLine = currentLine + ch;
            if (textWidth(testLine) > availableWidth && currentLine !== "") {
                lines.push({ line: currentLine, start: startIdx, end: i });
                currentLine = ch;
                startIdx = i;
            } else {
                currentLine = testLine;
            }
        }
        lines.push({ line: currentLine, start: startIdx, end: this.prompt.length });
        return lines;
    }
    getCharPosition(index) {
        textSize(16);
        let availableWidth = this.w - 20;
        let lineHeight = textAscent() + textDescent() + 2;
        let lines = this.getWrappedLines(availableWidth);
        for (let i = 0; i < lines.length; i++) {
            let { line, start, end } = lines[i];
            if (index >= start && index <= end) {
                let relativeIndex = index - start;
                let xPos = textWidth(line.substring(0, relativeIndex));
                let yPos = i * lineHeight;
                return { x: xPos, y: yPos, lineHeight: lineHeight };
            }
        }
        let lastLine = lines[lines.length - 1];
        return { x: textWidth(lastLine.line), y: (lines.length - 1) * lineHeight, lineHeight: lineHeight };
    }
    update() {
        if (this.dragging) {
            this.x = constrain(mouseX + this.offsetX, 0, width - this.w);
            this.y = constrain(mouseY + this.offsetY, 0, height - this.h - 100);
        }
        // If the box's x is within the spawn area, mark it as inSpawnArea.
        this.inSpawnArea = (this.x < spawnAreaWidth);
    }

    display() {
        stroke(this.selected ? color(255, 0, 0) : 0);
        fill(255);
        rect(this.x, this.y, this.w, this.h, 10);

        noStroke();
        fill(0);
        textSize(16);
        textAlign(LEFT, TOP);
        textWrap(WORD);
        text(this.prompt, this.x + 10, this.y + this.promptPadding, this.w - 20, this.maxPromptHeight);

        if (this.currentIndex < this.prompt.length) {
            let pos = this.getCharPosition(this.currentIndex);
            let highlightX = this.x + 10 + pos.x;
            let highlightY = this.y + this.promptPadding + pos.y;
            let currentChar = this.prompt.charAt(this.currentIndex);
            let charWidth = textWidth(currentChar);
            noStroke();
            fill(this.selected ? color(255, 0, 0, 150) : color(255, 255, 0, 150));
            rect(highlightX, highlightY, charWidth, pos.lineHeight);
        }

        if (this.autoTyperActive) {
            fill(0, 255, 0);
            noStroke();
            ellipse(this.x + this.w - 15, this.y + 15, 20, 20);
            fill(0);
            textSize(10);
            textAlign(CENTER, CENTER);
            text("AT", this.x + this.w - 15, this.y + 15);
        }
    }
    pressed() {
        // Only set dragging if we're not already dragging.
        if (this.dragging) return;
        if (mouseX > this.x && mouseX < this.x + this.w &&
            mouseY > this.y && mouseY < this.y + this.h) {
            this.dragging = true;
            this.offsetX = this.x - mouseX;
            this.offsetY = this.y - mouseY;
            this.originalX = this.x;
            this.originalY = this.y;
        }
    }
    released() {
        if (this.dragging) {
            this.dragging = false;
            let newX = this.x;
            let newY = this.y;
            let iterations = 0;
            let moved = true;

            // Only try collision resolution if dropped in the main board region.
            if (newX >= spawnAreaWidth) {
                while (moved && iterations < 20) {
                    moved = false;
                    for (let other of boxes) {
                        if (other === this) continue;
                        if (rectOverlap(newX, newY, this.w, this.h, other.x, other.y, other.w, other.h)) {
                            let moveX = 0, moveY = 0;
                            let overlapLeft = (newX + this.w) - other.x;
                            let overlapRight = (other.x + other.w) - newX;
                            let overlapTop = (newY + this.h) - other.y;
                            let overlapBottom = (other.y + other.h) - newY;
                            let minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
                            if (minOverlap === overlapLeft) {
                                moveX = -overlapLeft;
                            } else if (minOverlap === overlapRight) {
                                moveX = overlapRight;
                            } else if (minOverlap === overlapTop) {
                                moveY = -overlapTop;
                            } else if (minOverlap === overlapBottom) {
                                moveY = overlapBottom;
                            }
                            if (Math.abs(moveX) < Math.abs(moveY)) {
                                newX += moveX;
                            } else {
                                newY += moveY;
                            }
                            moved = true;
                        }
                    }
                    iterations++;
                }
                // If the final position is still invalid, revert to where dragging started.
                if (!this.boxIsValid(newX, newY)) {
                    newX = this.originalX;
                    newY = this.originalY;
                }
            } else {
                // If dropped in the spawn area, bounce back to where dragging started.
                newX = this.originalX;
                newY = this.originalY;
            }

            // Constrain within canvas and away from reserved auto typer area.
            this.x = constrain(newX, 0, width - this.w);
            this.y = constrain(newY, 0, height - this.h - 100);
        }
    }

    boxIsValid(x, y) {
        for (let b of boxes) {
            if (b === this) continue;
            if (rectOverlap(x, y, this.w, this.h, b.x, b.y, b.w, b.h)) return false;
        }
        return true;
    }
    reset() {
        if (this.type === "sentence") {
            this.prompt = getRandomPrompt();
            this.maxPromptHeight = this.h - this.promptPadding * 2;
        } else if (this.type === "letter") {
            this.prompt = getRandomLetter();
        }
        this.currentIndex = 0;
        this.finished = false;
    }
}

class AutoTyper {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.dragging = false;
        this.offsetX = 0;
        this.offsetY = 0;
        this.attachedBox = null;
        this.lastUpdateTime = millis();
        this.typingInterval = 500; // Milliseconds per character
        // New properties for upgrades:
        this.wordPerMinute = 60; // default WPM
        this.multiplier = 1.0;   // default multiplier
        this.level = 1;          // starting level
    }
    update() {
        if (this.attachedBox) {
            // Sync badge with the attached box
            this.x = this.attachedBox.x + this.attachedBox.w - 15;
            this.y = this.attachedBox.y + 15;
            // If the attached box is selected, pause auto typing.
            if (this.attachedBox.selected) return;
            if (!this.attachedBox.finished) {
                if (millis() - this.lastUpdateTime > this.typingInterval) {
                    if (this.attachedBox.currentIndex < this.attachedBox.prompt.length) {
                        this.attachedBox.currentIndex++;
                    } else {
                        this.attachedBox.finished = true;
                        if (this.attachedBox.type === "sentence") {
                            points += this.attachedBox.prompt.length * sentenceModifier;
                        } else if (this.attachedBox.type === "letter") {
                            points += 1;
                        }
                        updateScoreDisplay();
                        this.attachedBox.reset();
                    }
                    this.lastUpdateTime = millis();
                }
            }
        } else if (this.dragging) {
            this.x = mouseX + this.offsetX;
            this.y = mouseY + this.offsetY;
        }
    }
    display() {
        if (!this.attachedBox) {
            fill(200, 200, 255);
            stroke(0);
            ellipse(this.x, this.y, 30, 30);
            fill(0);
            textSize(12);
            textAlign(CENTER, CENTER);
            text("AT", this.x, this.y);
        } else {
            // When attached, its badge is drawn in the box's display() method.
        }
    }
    pressed() {
        // If clicking within the auto typer, select it.
        if (dist(mouseX, mouseY, this.x, this.y) < 15) {
            activeAutoTyper = this;
            updateAutoTyperInfo();
        }
        // Also allow dragging if not attached.
        if (dist(mouseX, mouseY, this.x, this.y) < 15 && !this.attachedBox) {
            this.dragging = true;
            this.offsetX = this.x - mouseX;
            this.offsetY = this.y - mouseY;
        }
    }
    released() {
        if (this.dragging) {
            this.dragging = false;
            for (let box of boxes) {
                if (!box.autoTyperActive &&
                    mouseX > box.x && mouseX < box.x + box.w &&
                    mouseY > box.y && mouseY < box.y + box.h) {
                    this.attachedBox = box;
                    box.autoTyperActive = true;
                    this.x = box.x + box.w - 15;
                    this.y = box.y + 15;
                    break;
                }
            }
        }
    }
}
