/**
 * This script creates an interactive artwork inspired by Pacita Abad's "Wheels of Fortune."
 * It generates a dynamic arrangement of interconnected wheels with vibrant color palettes.
 *
 * The artwork features:
 * - Procedurally generated wheels with varied sizes and positions, allowing for slight overlaps.
 * - Decorative connectors between nearby wheels, mimicking a chain-like appearance.
 * - Interactive elements:
 * - Clicking a wheel triggers a "dandelion" effect, dispersing its internal elements (spokes and outer dots)
 * and those of other wheels sharing the same base color.
 * - Pressing the spacebar triggers a "rewind" effect, bringing the dispersed particles back to their
 * original wheels, and gradually fading in the wheels' internal patterns.
 *
 * The "dandelion" and "rewind" functionalities are implemented using a particle system and state management
 * within the Wheel and DandelionParticle classes.
 */

// --- Global Variables ---


let song; // Used to store loaded sound files
let fft; // Let's make a variable to hold the FFT object
let button; // Buttons for playing/pausing music
const numBins = 128; // Set the number of audio analysis bands
const smoothing = 0.8; // Set frequency analysis smoothness

function preload() {
  song = loadSound("assets/613323__rokzroom__loop-of-life-v01.wav");
} //Used to load media files before the program starts

function play_pause() {
  if (song.isPlaying()) {
    song.stop();
  } else {
    song.loop();
  }
} //This is a play/pause control function

/**
 * @type {Array<Wheel>} wheels - An array to store all Wheel objects displayed on the canvas.
 * These are the central, circular elements of the artwork.
 */
let wheels = [];

/**
 * @type {Array<Connector>} connectors - An array to store all Connector objects.
 * These lines visually link nearby wheels, adding to the composition.
 */
let connectors = [];

/**
 * @type {Array<DandelionParticle>} dandelionParticles - An array to store all active DandelionParticle objects.
 * These particles are generated when a wheel is "blown away" and animate independently.
 */
let dandelionParticles = [];

/**
 * @type {Array<Array<Wheel>>} blownAwayHistory - A history stack to store groups of wheels that were "blown away."
 * This is crucial for the rewind functionality, allowing wheels to be restored in reverse order.
 * Each entry in the array is itself an array of Wheel objects that were simultaneously affected.
 */
let blownAwayHistory = [];


/**
 * @const {Array<Array<string>>} colorPalettes - A collection of predefined color palettes for the wheels.
 * Each inner array defines the colors for different parts of a single wheel:
 * [Base, Outer Dots, Inner Dots/Spokes Stroke, Spokes Fill, Center]
 * These palettes are inspired by the vibrant and layered approach seen in Pacita Abad's "Wheels of Fortune."
 */
const colorPalettes = [
  // Palette 1: Deep Blue/Purple with Yellow/Orange Accents
  ['#45206A', '#FFD700', '#FF8C00', '#B0E0E6', '#8A2BE2'], // Base, Outer Dots, Inner Circles, Spokes/Inner Dots, Center
  // Palette 2: Fiery Reds and Oranges with Green/Blue contrast
  ['#D90429', '#F4D35E', '#F7B267', '#0A796F', '#2E4057'],
  // Palette 3: Warm Earthy Tones with Bright Pinks/Greens
  ['#A34A2A', '#F2AF29', '#E0A890', '#3E8914', '#D4327C'],
  // Palette 4: Cool Blues and Greens with Yellow/Pink Pop
  ['#004C6D', '#7FC2BF', '#FFC94F', '#D83A56', '#5C88BF'],
  // Palette 5: Vibrant Pinks and Purples with Yellow/Green
  ['#C11F68', '#F9E795', '#F5EEF8', '#2ECC71', '#8E44AD'],
  // Palette 6: Deep Teal with Orange/Red
  ['#006D77', '#FF8C00', '#E29578', '#83C5BE', '#D64045'],
];

/**
 * @const {string} backgroundColor - The background color of the canvas.
 * A dark, muted tone is chosen to make the vibrant wheels stand out,
 * similar to the atmospheric quality of the original painting.
 */
const backgroundColor = '#2A363B';


// --- p5.js Core Functions ---

/**
 * `setup()` is a p5.js function that runs once when the program starts.
 * It's used to define initial environment properties like canvas size
 * and to perform initial setup for the artwork.
 */
function setup() {
  fft = new p5.FFT(smoothing, numBins);
  song.connect(fft); //Connecting your loaded audio to the FFT object
  
  button = createButton("Play/Pause"); //Create a new HTML button with the text ‘Play/Pause’ displayed on the button
  button.position((width - button.width) / 2, height - button.height - 2); //Sets the position of the button on the canvas.
  button.mousePressed(play_pause); //Add a ‘click event’ to this button. When the user clicks on the button, the previously defined `play_pause()` function will be executed

  /**
   * Step 1: Create the Canvas.
   * `createCanvas(width, height)` sets up the drawing surface.
   * `windowWidth` and `windowHeight` make the canvas fill the entire browser window.
   */
  createCanvas(windowWidth, windowHeight);

  /**
   * Step 2: Set the Angle Mode.
   * `angleMode(RADIANS)` specifies that all angle calculations (e.g., `cos()`, `sin()`)
   * will use radians instead of degrees, which is common practice in p5.js.
   */
  angleMode(RADIANS);

  /**
   * Step 3: Initialize the Artwork.
   * Call a custom function to populate the `wheels` and `connectors` arrays
   * and prepare the initial visual state of the artwork.
   */
  initializeArtwork();
}

/**
 * `draw()` is a p5.js function that runs repeatedly, continuously executing
 * the code within it. It's the main rendering loop of the sketch.
 */
function draw() {
  /**
   * Step 1: Draw the Background.
   * `background()` clears the canvas in each frame, creating a sense of animation
   * by redrawing all elements from scratch.
   */
  background(backgroundColor);

  let spectrum = fft.analyze(); //Analysing the current music spectrum
  
  for (let i = 0; i < wheels.length; i++) {
    const spectrumIndex = floor(map(i, 0, wheels.length, 0, numBins));
    wheels[i].updateAudioScale(spectrum[spectrumIndex]);
  } //Let the wheels bounce according to the spectrum
  
  // Draw connectors
  for (const conn of connectors) {
    conn.display();
  }
  
  // Draw wheels
  for (const wheel of wheels) {
    wheel.display();
    wheel.updateAlpha();
  }
  
  /**
   * Step 4: Update and Display Dandelion Particles.
   * Iterate through the `dandelionParticles` array in reverse.
   * Iterating backward is important when removing elements from an array
   * during iteration, as it prevents skipping elements.
   * - `p.update()` calculates the particle's new position, size, and transparency.
   * - `p.display()` draws the particle at its updated state.
   * - Particles are removed from the array if their alpha becomes zero
   * and they are either not returning (flown away and faded out) or
   * have returned to their target and faded out. This keeps the array clean.
   */
  for (let i = dandelionParticles.length - 1; i >= 0; i--) {
    let p = dandelionParticles[i];
    p.update();
    p.display();
    if ((p.alpha <= 0 && !p.isReturning) || (p.isReturning && dist(p.x, p.y, p.targetX, p.targetY) < 1 && p.alpha <= 0)) {
      dandelionParticles.splice(i, 1);
    }
  }
}


// --- Initialization Function ---

/**
 * `initializeArtwork()` sets up the initial arrangement of wheels and connectors.
 * It's called once in `setup()` and again when the window is resized.
 * This function also clears any existing interactive elements to ensure a fresh start.
 */
function initializeArtwork() {
  /**
   * Step 1: Clear existing arrays.
   * Resetting these arrays ensures that when the function is called again (e.g., on window resize),
   * no old wheels, connectors, or particles persist from previous configurations.
   */
  wheels = [];
  connectors = [];
  dandelionParticles = [];
  blownAwayHistory = [];

  /**
   * Step 2: Define wheel generation parameters.
   * `numWheels`: The target number of wheels to place. Adjusted for a denser look.
   * `minRadius`, `maxRadius`: The minimum and maximum possible radii for the wheels.
   * `maxAttempts`: A safeguard to prevent infinite loops if wheel placement becomes impossible.
   * `currentAttempts`: Tracks how many attempts have been made to place wheels.
   */
  const numWheels = 25;
  const minRadius = width * 0.04;
  const maxRadius = width * 0.12;
  const maxAttempts = 5000;
  let currentAttempts = 0;

  /**
   * Step 3: Generate wheels with optimized packing.
   * This loop attempts to place `numWheels` on the canvas, trying to avoid excessive overlaps
   * and ensuring that new wheels are reasonably close to existing ones for connections.
   */
  while (wheels.length < numWheels && currentAttempts < maxAttempts) {
    // Generate a random radius and position for a potential new wheel.
    let candidateRadius = random(minRadius, maxRadius);
    let candidateX = random(candidateRadius, width - candidateRadius);
    let candidateY = random(candidateRadius, height - candidateRadius);

    // Flags to track overlap and proximity to other wheels.
    let isOverlappingTooMuch = false;
    let hasNearbyWheel = false;

    // Check the candidate wheel against all existing wheels.
    for (let other of wheels) {
      let d = dist(candidateX, candidateY, other.x, other.y); // Distance between centers.
      let combinedRadius = candidateRadius + other.radius;    // Sum of their radii.

      // Allow a controlled amount of overlap (e.g., 40% of the smaller radius)
      // This is crucial for mimicking the dense, overlapping style of the original artwork.
      const overlapThreshold = min(candidateRadius, other.radius) * 0.4;
      if (d < combinedRadius - overlapThreshold) {
        isOverlappingTooMuch = true; // Mark as excessively overlapping.
        break; // No need to check further against other wheels.
      }
      // Check if the candidate is close enough to an existing wheel to form a connection.
      if (d < combinedRadius * 1.5) {
        hasNearbyWheel = true; // Mark as having a potential neighbor.
      }
    }

    // The first wheel doesn't need neighbors, so set `hasNearbyWheel` to true.
    if (wheels.length === 0) {
      hasNearbyWheel = true;
    }

    // If the candidate wheel doesn't overlap too much and has a nearby wheel (or is the first), add it.
    if (!isOverlappingTooMuch && hasNearbyWheel) {
      // Select a random color palette for the new wheel.
      let selectedPalette = random(colorPalettes);
      // Ensure diversity: avoid using the same palette consecutively if possible.
      if (wheels.length > 0 && selectedPalette === wheels[wheels.length - 1].colors) {
        selectedPalette = random(colorPalettes.filter(p => p !== selectedPalette));
      }
      wheels.push(new Wheel(candidateX, candidateY, candidateRadius, selectedPalette));
    }
    currentAttempts++; // Increment attempt counter.
  }

  // Log a message if not all wheels could be placed within the maximum attempts.
  if (currentAttempts >= maxAttempts) {
    console.log("Could not place all wheels within limits.");
  }

  /**
   * Step 4: Generate connectors between nearby wheels.
   * This nested loop checks all pairs of wheels and creates a connector if they are close enough.
   */
  for (let i = 0; i < wheels.length; i++) {
    for (let j = i + 1; j < wheels.length; j++) { // Start from i + 1 to avoid duplicate connections and self-connections.
      let w1 = wheels[i];
      let w2 = wheels[j];
      let d = dist(w1.x, w1.y, w2.x, w2.y); // Calculate distance between wheel centers.

      // Connect wheels if their distance is within 1.3 times their combined radii.
      // This allows for connections even with small gaps or slight overlaps.
      if (d < (w1.radius + w2.radius) * 1.3) {
        // Create a new Connector object and add it to the `connectors` array.
        // A random color from a palette is chosen for the connector.
        connectors.push(new Connector(w1, w2, random(colorPalettes)[0]));
      }
    }
  }
}


// --- Wheel Class ---

/**
 * @class Wheel
 * @description Represents a single circular wheel in the artwork.
 * Each wheel has a position, radius, a specific color palette, and properties
 * to manage its interactive state (blown away or visible).
 */
class Wheel {
  /**
   * @constructor
   * @param {number} x - The x-coordinate of the wheel's center.
   * @param {number} y - The y-coordinate of the wheel's center.
   * @param {number} radius - The radius of the wheel.
   * @param {Array<string>} palette - An array of hex color strings for different wheel components.
   */
  constructor(x, y, radius, palette) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.colors = palette; // The assigned color palette for this wheel.
    this.stemAngle = random(TWO_PI); // Random angle for a small decorative "stem."

    /**
     * @property {boolean} isBlownAway - Controls whether the wheel's internal patterns (spokes, outer dots) are drawn.
     * When `true`, these elements disappear, simulating the "blown away" effect.
     * Default is `false` (visible).
     */
    this.isBlownAway = false;

    /**
     * @property {number} innerAlpha - The current alpha (transparency) value for the wheel's inner patterns.
     * This is used for the fade-in animation when a wheel is restored.
     * Ranges from 0 (fully transparent) to 255 (fully opaque).
     */
    this.innerAlpha = 0;

    /**
     * @property {number} targetInnerAlpha - The desired final alpha value for the inner patterns (always 255).
     */
    this.targetInnerAlpha = 255;

    /**
     * @property {number} fadeSpeed - The increment by which `innerAlpha` changes each frame.
     * A higher value means a faster fade-in effect.
     */
    this.fadeSpeed = 5;

    this.baseRadius = radius; //Stores the initial radius, keeping a reference to the ‘original size’.
    this.targetRadius = radius; //Target radius variables prepared for future animation smoothing
    this.audioScale = 1; //Current scaling factor, initially 1.
  }

  updateAudioScale(spectrumValue) {
    this.audioScale = map(spectrumValue, 0, 255, 0.8, 1.2); //The volume of a frequency band extracted from the FFT in the range 0 to 255.Maps volume values to a scaling multiplier (0.8 to 1.2), the louder the tone, the greater the multiplier.
    this.radius = this.baseRadius * this.audioScale; //Multiply the original radius by the multiplier to update the current radius to achieve the visual effect of ‘size jumping’.
  }

  /**
   * `display()` draws all components of the wheel on the canvas.
   * It uses `push()` and `pop()` to isolate transformations (like `translate`).
   */
  display() {
    push(); // Save the current drawing state.
    translate(this.x, this.y); // Move the origin to the wheel's center.

    scale(this.audioScale); //Scale all graphics drawn afterwards, using this.audioScale as the scale factor.

    // Draw layers from back to front to ensure correct visual stacking.
    this.drawBaseCircle();

    /**
     * Only draw the outer dots and spokes if the wheel is NOT in the "blown away" state.
     * This condition directly controls their visibility.
     */
    if (!this.isBlownAway) {
      this.drawOuterDots();
      this.drawSpokes();
    }

    this.drawInnerCircles();
    this.drawStem(); // This element is always drawn as it's part of the base structure.

    pop(); // Restore the previous drawing state.
  }

  /**
   * `updateAlpha()` manages the fade-in animation of the wheel's internal patterns.
   * This method is called in the main `draw` loop for every wheel.
   */
  updateAlpha() {
    if (this.isBlownAway) {
      // If the wheel is blown away, its inner patterns should be invisible.
      this.innerAlpha = 0;
    } else {
      // If the wheel is not blown away (i.e., it's visible or returning),
      // gradually increase its inner pattern alpha towards full opacity.
      if (this.innerAlpha < this.targetInnerAlpha) {
        // `min()` ensures `innerAlpha` does not exceed `targetInnerAlpha`.
        this.innerAlpha = min(this.innerAlpha + this.fadeSpeed, this.targetInnerAlpha);
      }
    }
  }

  /**
   * `drawBaseCircle()` draws the largest, solid circle that forms the foundation of the wheel.
   */
  drawBaseCircle() {
    noStroke(); // No outline for the circle.
    fill(this.colors[0]); // Use the first color from the assigned palette.
    circle(0, 0, this.radius * 2); // Draw a circle centered at the origin (due to `translate`).
  }

  /**
   * `drawOuterDots()` draws a ring of small dots near the outer edge of the wheel.
   * Their transparency is controlled by `innerAlpha` for the fade-in effect.
   */
  drawOuterDots() {
    const dotCount = 40;        // Number of dots in the ring.
    const dotRadius = this.radius * 0.9; // Radial distance of dots from the center.
    const dotSize = this.radius * 0.08;  // Size of individual dots.

    // Get the base color for outer dots and apply the current `innerAlpha` to its transparency.
    let dotColor = color(this.colors[1]);
    dotColor.setAlpha(this.innerAlpha);
    fill(dotColor); // Set the fill color with dynamic alpha.
    noStroke();     // No outline for the dots.

    // Loop to draw each individual dot around the circle.
    for (let i = 0; i < dotCount; i++) {
      const angle = map(i, 0, dotCount, 0, TWO_PI); // Calculate angle for even distribution.
      const dx = cos(angle) * dotRadius;           // X offset from center.
      const dy = sin(angle) * dotRadius;           // Y offset from center.
      circle(dx, dy, dotSize); // Draw the dot.
    }
  }

  /**
   * `drawSpokes()` draws radiating lines (spokes) from the center towards the outer part of the wheel.
   * Their transparency is controlled by `innerAlpha` for the fade-in effect.
   */
  drawSpokes() {
    const spokeCount = 24;       // Number of spokes.
    const innerRadius = this.radius * 0.55; // Inner radial start point of spokes.
    const outerRadius = this.radius * 0.8;  // Outer radial end point of spokes.

    // Get the base color for spokes and apply the current `innerAlpha` to its transparency.
    let spokeColor = color(this.colors[3]);
    spokeColor.setAlpha(this.innerAlpha);
    stroke(spokeColor);         // Set the stroke color with dynamic alpha.
    strokeWeight(this.radius * 0.03); // Set the thickness of the spokes.

    // Loop to draw each individual spoke.
    for (let i = 0; i < spokeCount; i++) {
      const angle = map(i, 0, spokeCount, 0, TWO_PI); // Calculate angle for even distribution.
      const x1 = cos(angle) * innerRadius;           // Inner X coordinate.
      const y1 = sin(angle) * innerRadius;           // Inner Y coordinate.
      const x2 = cos(angle) * outerRadius;           // Outer X coordinate.
      const y2 = sin(angle) * outerRadius;           // Outer Y coordinate.
      line(x1, y1, x2, y2); // Draw the line segment for the spoke.
    }
  }

  /**
   * `drawInnerCircles()` draws multiple concentric circles and an inner ring of dots.
   * These are always visible, as they are part of the core structure, not the "blown away" elements.
   */
  drawInnerCircles() {
    noStroke(); // No outline for these circles.

    // First inner circle.
    fill(this.colors[2]);
    circle(0, 0, this.radius * 0.6);

    // Inner ring of dots.
    fill(this.colors[3]);
    const innerDotCount = 20;
    const innerDotRadius = this.radius * 0.4;
    const innerDotSize = this.radius * 0.06;
    for (let i = 0; i < innerDotCount; i++) {
      const angle = map(i, 0, innerDotCount, 0, TWO_PI);
      const dx = cos(angle) * innerDotRadius;
      const dy = sin(angle) * innerDotRadius;
      circle(dx, dy, innerDotSize);
    }

    // Second inner circle.
    fill(this.colors[4]);
    circle(0, 0, this.radius * 0.3);

    // Smallest center circle.
    fill(this.colors[0]); // Reusing the base color.
    circle(0, 0, this.radius * 0.15);
  }

  /**
   * `drawStem()` draws a small, curved line with a dot at its end,
   * resembling a decorative stem emanating from the wheel's center.
   */
  drawStem() {
    stroke(this.colors[1]); // Use the second color from the palette for the stem.
    strokeWeight(this.radius * 0.04); // Set the thickness of the stem.
    noFill(); // The stem is a line, so no fill.

    // Calculate start, end, and control points for a quadratic Bezier curve.
    // The start point is slightly offset from the center.
    const startX = cos(this.stemAngle) * (this.radius * 0.075);
    const startY = sin(this.stemAngle) * (this.radius * 0.075);
    // The end point is further out.
    const endX = cos(this.stemAngle) * (this.radius * 0.5);
    const endY = sin(this.stemAngle) * (this.radius * 0.5);
    // The control point creates the curve, offset by an angle.
    const controlX = cos(this.stemAngle + 0.5) * (this.radius * 0.4);
    const controlY = sin(this.stemAngle + 0.5) * (this.radius * 0.4);

    beginShape();          // Start defining a custom shape.
    vertex(startX, startY); // Define the starting point.
    quadraticVertex(controlX, controlY, endX, endY); // Define the quadratic Bezier curve.
    endShape();            // End the shape definition.

    noStroke();           // No outline for the final dot.
    fill(this.colors[1]); // Fill the dot with the stem's color.
    circle(endX, endY, this.radius * 0.08); // Draw a circle at the end of the stem.
  }

  /**
   * `contains(px, py)` checks if a given point (e.g., mouse coordinates) is within the wheel's bounds.
   * @param {number} px - The x-coordinate of the point to check.
   * @param {number} py - The y-coordinate of the point to check.
   * @returns {boolean} `true` if the point is inside the wheel, `false` otherwise.
   */
  contains(px, py) {
    let d = dist(px, py, this.x, this.y); // Calculate distance from the point to the wheel's center.
    return d < this.radius; // If distance is less than radius, the point is inside.
  }
}


// --- Connector Class ---

/**
 * @class Connector
 * @description Represents a visual link between two Wheel objects.
 * It draws a line with decorative "chain links" and a central blob,
 * inspired by the intricate connections in the original artwork.
 */
class Connector {
  /**
   * @constructor
   * @param {Wheel} wheel1 - The first Wheel object to connect.
   * @param {Wheel} wheel2 - The second Wheel object to connect.
   * @param {string} connectColor - The color to use for the connector line and some decorations.
   */
  constructor(wheel1, wheel2, connectColor) {
    this.w1 = wheel1; // Reference to the first wheel.
    this.w2 = wheel2; // Reference to the second wheel.
    this.color = connectColor; // Color for the connector.

    // Pre-calculate angle and start/end points for drawing efficiency.
    // The angle is from wheel1 to wheel2.
    this.angle = atan2(this.w2.y - this.w1.y, this.w2.x - this.w1.x);
    // The start point is on the circumference of wheel1, facing wheel2.
    this.startPoint = createVector(
      this.w1.x + cos(this.angle) * this.w1.radius,
      this.w1.y + sin(this.angle) * this.w1.radius
    );
    // The end point is on the circumference of wheel2, facing wheel1 (angle + PI).
    this.endPoint = createVector(
      this.w2.x + cos(this.angle + PI) * this.w2.radius,
      this.w2.y + sin(this.angle + PI) * this.w2.radius
    );
  }

  /**
   * `display()` draws the connector, including the main line, chain links, and central blob.
   */
  display() {
    stroke(this.color);     // Set the stroke color for the connector.
    strokeWeight(5);        // Make the line thicker for better visibility.
    noFill();               // No fill for the main connection line.

    /**
     * Step 1: Draw the main connection line.
     * This line connects the outer edges of the two wheels.
     */
    line(this.startPoint.x, this.startPoint.y, this.endPoint.x, this.endPoint.y);

    /**
     * Step 2: Add decorative chain-link elements along the line.
     * This creates a more intricate, mechanical, or jewelry-like feel, similar to Abad's style.
     */
    let midX = (this.startPoint.x + this.endPoint.x) / 2; // Midpoint X for central blob.
    let midY = (this.startPoint.y + this.endPoint.y) / 2; // Midpoint Y for central blob.
    let distBetweenWheels = dist(this.startPoint.x, this.startPoint.y, this.endPoint.x, this.endPoint.y); // Total length of the connector.

    const linkSize = 10; // Size of individual chain links.
    // Calculate the number of links to evenly space them along the connector.
    const numLinks = floor(distBetweenWheels / (linkSize * 1.5));
    if (numLinks > 0) { // Only draw links if there's enough space.
      for (let i = 0; i <= numLinks; i++) {
        let lerpAmount = map(i, 0, numLinks, 0, 1); // Get a value between 0 and 1 for linear interpolation.
        let linkX = lerp(this.startPoint.x, this.endPoint.x, lerpAmount); // Calculate link X position.
        let linkY = lerp(this.startPoint.y, this.endPoint.y, lerpAmount); // Calculate link Y position.

        fill(255, 200, 100); // Yellow-orange color for the links.
        stroke(this.color);  // Outline matching the connector line.
        strokeWeight(1);     // Thin outline for links.
        circle(linkX, linkY, linkSize); // Draw the link (a small circle).

        fill(0);             // Tiny inner dot for more detail.
        noStroke();
        circle(linkX, linkY, linkSize * 0.4);
      }
    }

    /**
     * Step 3: Draw a decorative central blob.
     * This adds a focal point or a "joint" where the connector might pivot.
     */
    fill(255, 255, 255); // White base for the blob.
    stroke(this.color);  // Border matching the connection line.
    strokeWeight(3);     // Medium thickness border.
    circle(midX, midY, 20); // Larger central circle.

    fill(this.color); // Inner color matching connection.
    noStroke();
    circle(midX, midY, 10); // Smaller inner circle.

    /**
     * Step 4: Draw radiating dots around the central blob.
     * These add a burst or energy effect around the central connection point.
     */
    fill(255, 200, 100); // Yellow-orange for small dots.
    noStroke();
    const numSmallDots = 8;        // Number of radiating dots.
    const smallDotRadius = 15;     // Radial distance of these dots from the blob center.
    const smallDotSize = 4;        // Size of these small dots.
    for (let i = 0; i < numSmallDots; i++) {
      let angle = map(i, 0, numSmallDots, 0, TWO_PI); // Calculate angle for even distribution.
      let dx = midX + cos(angle) * smallDotRadius;   // X offset.
      let dy = midY + sin(angle) * smallDotRadius;   // Y offset.
      circle(dx, dy, smallDotSize); // Draw the small dot.
    }
  }
}

// --- DandelionParticle Class ---

/**
 * @class DandelionParticle
 * @description Represents an individual particle (a spoke or an outer dot)
 * that detaches from a wheel and animates away or returns.
 * This class is key to the interactive "dandelion" and "rewind" effects.
 */
class DandelionParticle {
  /**
   * @constructor
   * @param {number} x - Initial x-coordinate of the particle.
   * @param {number} y - Initial y-coordinate of the particle.
   * @param {string} type - The type of particle ('spoke' or 'outerDot'), determining its drawing method.
   * @param {string} color - The base color of the particle.
   * @param {number} size - The initial size of the particle.
   * @param {number} targetX - The x-coordinate where the particle should return (original position on wheel).
   * @param {number} targetY - The y-coordinate where the particle should return (original position on wheel).
   * @param {number} [initialAngle=0] - Optional initial rotation angle for 'spoke' particles.
   */
  constructor(x, y, type, color, size, targetX, targetY, initialAngle = 0) {
    this.x = x;
    this.y = y;
    this.type = type; // 'spoke' or 'outerDot'.
    this.color = color;
    this.size = size;
    this.alpha = 255; // Initial alpha: fully opaque.

    // Store original and target positions for the return animation.
    this.originalX = x; // The point where the particle started its journey.
    this.originalY = y;
    this.targetX = targetX; // The precise location on the wheel it came from.
    this.targetY = targetY;

    // Initial velocity: particles fly towards the bottom-left to simulate being "blown."
    this.vel = p5.Vector.fromAngle(random(PI + PI / 4, PI + PI / 2)); // Angle range (135 to 180 degrees).
    this.vel.mult(random(1, 3)); // Random initial speed.

    this.rotation = initialAngle; // Initial rotation for spokes.
    this.rotationSpeed = random(-0.05, 0.05); // Random rotation speed for spokes.
    this.windX = random(-0.05, -0.2); // Gentle horizontal wind (leftward).
    this.windY = random(0.05, 0.2); // Gentle vertical wind (downward).

    /**
     * @property {boolean} isReturning - A flag to control the particle's behavior.
     * When `true`, the particle animates back towards its `targetX`, `targetY`.
     * Default is `false` (flying away).
     */
    this.isReturning = false;

    /**
     * @property {number} returnSpeed - The speed at which the particle `lerps` (linearly interpolates)
     * back to its target position when `isReturning` is `true`.
     */
    this.returnSpeed = 0.05;
  }

  /**
   * `update()` calculates the particle's new state (position, size, alpha) each frame.
   * It has different logic based on whether the particle is flying away or returning.
   */
  update() {
    if (this.isReturning) {
      /**
       * If the particle is returning:
       * - It `lerps` (moves smoothly) from its current position towards its `targetX`, `targetY`.
       * - Its `alpha` also `lerps` towards 0, making it fade out as it approaches the wheel,
       * simulating it re-merging with the wheel's pattern.
       * - Its `size` smoothly returns to its original size (though it then fades).
       * - Its `rotationSpeed` slows down to 0.
       */
      this.x = lerp(this.x, this.targetX, this.returnSpeed);
      this.y = lerp(this.y, this.targetY, this.returnSpeed);
      this.alpha = lerp(this.alpha, 0, this.returnSpeed * 2); // Fade out faster.
      this.size = lerp(this.size, (this.type === 'spoke' ? this.size / 5 : this.size), this.returnSpeed * 2); // Restore size.
      this.rotationSpeed = lerp(this.rotationSpeed, 0, 0.05); // Stop rotation.

    } else {
      /**
       * If the particle is flying away:
       * - Its position is updated by its current velocity.
       * - Wind forces are continuously applied to its velocity.
       * - Its `rotation` is updated by `rotationSpeed` (for spokes).
       * - Its `alpha` gradually decreases (fades out).
       * - Its `size` slightly shrinks over time.
       */
      this.x += this.vel.x;
      this.y += this.vel.y;
      this.vel.add(this.windX, this.windY); // Apply wind force.

      this.rotation += this.rotationSpeed; // Update rotation for spokes.

      this.alpha -= 2; // Fade out over time.
      this.size *= 0.99; // Shrink slightly.
    }
  }

  /**
   * `display()` draws the particle on the canvas at its current state.
   */
  display() {
    push(); // Save the current drawing state.
    translate(this.x, this.y); // Move origin to particle's position.
    rotate(this.rotation);     // Apply rotation (mainly for spokes).
    noStroke();                // No outline for dots.

    // Set fill color with current alpha.
    fill(red(this.color), green(this.color), blue(this.color), this.alpha);

    // Draw based on particle type.
    if (this.type === 'outerDot' || this.type === 'innerDot') {
      circle(0, 0, this.size); // Draw a circle for dots.
    } else if (this.type === 'spoke') {
      // Draw a line segment for spokes.
      stroke(red(this.color), green(this.color), blue(this.color), this.alpha); // Stroke color with alpha.
      strokeWeight(this.size * 0.3); // Adjust stroke weight for visibility.
      line(0, 0, this.size, 0); // Draw a line from origin, which is then rotated.
    }
    pop(); // Restore the previous drawing state.
  }
}


// --- Event Handlers ---

/**
 * `mousePressed()` is a p5.js function that is called once every time a mouse button is pressed.
 * This function handles the "dandelion" effect when a wheel is clicked.
 */
function mousePressed() {
  /**
   * Step 1: Iterate through wheels to check for a click.
   * Iterate in reverse to process the top-most (last drawn) wheels first in case of overlap.
   */
  for (let i = wheels.length - 1; i >= 0; i--) {
    let wheel = wheels[i];
    /**
     * Step 2: Check if the mouse click is within a wheel and if that wheel is not already "blown away."
     * `wheel.contains(mouseX, mouseY)` uses a helper method to detect the click area.
     */
    if (wheel.contains(mouseX, mouseY) && !wheel.isBlownAway) {
      /**
       * Step 3: Identify all wheels that share the same base color as the clicked wheel
       * and are not already "blown away." These wheels will also be affected.
       */
      const clickedWheelBaseColor = wheel.colors[0];
      const wheelsToBlow = wheels.filter(w => w.colors[0] === clickedWheelBaseColor && !w.isBlownAway);

      if (wheelsToBlow.length > 0) {
        /**
         * Step 4: Record the "blown away" event in `blownAwayHistory`.
         * We store references to the actual wheel objects. This allows the spacebar
         * to "undo" this action by restoring these specific wheels.
         */
        blownAwayHistory.push(wheelsToBlow.map(w => w));

        /**
         * Step 5: Process each wheel that needs to be "blown away."
         */
        for (const w of wheelsToBlow) {
          w.isBlownAway = true; // Mark the wheel as "blown away," making its internal patterns disappear.
          w.innerAlpha = 0;     // Immediately set the inner pattern alpha to 0 for a quick disappearance.

          /**
           * Step 6: Generate dandelion particles for the wheel's spokes.
           * Each spoke is converted into a `DandelionParticle` object.
           */
          const spokeCount = 24;
          const innerRadius = w.radius * 0.55;
          const outerRadius = w.radius * 0.8;
          const spokeColor = w.colors[3]; // Spokes color from palette.
          const spokeSize = w.radius * 0.03; // Base size for spoke particles.

          for (let j = 0; j < spokeCount; j++) {
            const angle = map(j, 0, spokeCount, 0, TWO_PI);
            // Particles start at the outer end of where the spoke was.
            const startX = w.x + cos(angle) * outerRadius;
            const startY = w.y + sin(angle) * outerRadius;
            // The target is its original position for returning.
            const targetX = w.x + cos(angle) * outerRadius;
            const targetY = w.y + sin(angle) * outerRadius;
            dandelionParticles.push(new DandelionParticle(startX, startY, 'spoke', spokeColor, spokeSize * 5, targetX, targetY, angle));
          }

          /**
           * Step 7: Generate dandelion particles for the wheel's outer dots.
           * Each outer dot is also converted into a `DandelionParticle` object.
           */
          const dotCount = 40;
          const dotRadius = w.radius * 0.9;
          const dotColor = w.colors[1]; // Outer dots color from palette.
          const dotSize = w.radius * 0.08; // Base size for dot particles.

          for (let j = 0; j < dotCount; j++) {
            const angle = map(j, 0, dotCount, 0, TWO_PI);
            const dx = w.x + cos(angle) * dotRadius;
            const dy = w.y + sin(angle) * dotRadius;
            // The target is its original position for returning.
            const targetX = w.x + cos(angle) * dotRadius;
            const targetY = w.y + sin(angle) * dotRadius;
            dandelionParticles.push(new DandelionParticle(dx, dy, 'outerDot', dotColor, dotSize, targetX, targetY));
          }
        }
      }
      break; // Only process one wheel click at a time to avoid multiple effects from one click.
    }
  }
}

/**
 * `keyPressed()` is a p5.js function that is called once every time a key is pressed.
 * This function handles the "rewind" effect when the spacebar is pressed.
 */
function keyPressed() {
  /**
   * Step 1: Check if the pressed key is the spacebar.
   * `keyCode === 32` corresponds to the spacebar.
   */
  if (keyCode === 32) {
    /**
     * Step 2: Check if there are any "blown away" events in the history.
     * `blownAwayHistory.length > 0` ensures there's something to undo.
     */
    if (blownAwayHistory.length > 0) {
      /**
       * Step 3: Retrieve the last group of wheels that were blown away.
       * `blownAwayHistory.pop()` removes and returns the last element from the array,
       * ensuring restoration happens in reverse order of disappearance ("from back to front").
       */
      const wheelsToRestore = blownAwayHistory.pop();

      /**
       * Step 4: Restore each wheel in the retrieved group.
       */
      for (const w of wheelsToRestore) {
        w.isBlownAway = false; // Set the wheel back to "not blown away," enabling its pattern to reappear.
        w.innerAlpha = 0;     // Explicitly set alpha to 0 to start the fade-in animation from transparent.

        /**
         * Step 5: Animate associated dandelion particles back to the wheel.
         * Filter `dandelionParticles` to find those that belong to the current wheel being restored.
         * The `dist` check uses the particle's `targetX`/`targetY` (original position on the wheel)
         * to accurately identify which particles belong to which wheel.
         */
        const particlesToReturn = dandelionParticles.filter(p =>
          // For spoke particles, check proximity to their original spoke end.
          (p.type === 'spoke' && dist(p.targetX, p.targetY, w.x + cos(p.rotation) * w.radius * 0.8, w.y + sin(p.rotation) * w.radius * 0.8) < 10) ||
          // For outer dot particles, check proximity to their original dot position.
          (p.type === 'outerDot' && dist(p.targetX, p.targetY, w.x + cos(atan2(p.targetY - w.y, p.targetX - w.x)) * w.radius * 0.9, w.y + sin(atan2(p.targetY - w.y, p.targetX - w.x)) * w.radius * 0.9) < 10)
        );

        for (const p of particlesToReturn) {
          p.isReturning = true; // Set the flag to initiate the return animation.
          // Set `originalX` and `originalY` to the particle's *current* position,
          // so the `lerp` function can animate it smoothly from where it is now.
          p.originalX = p.x;
          p.originalY = p.y;
          // Particles will fade out as they return (alpha lerps to 0),
          // simulating them merging back into the wheel's pattern.
        }
      }
    }
  }
}

/**
 * `windowResized()` is a p5.js function that is called automatically whenever the browser window is resized.
 * This ensures the canvas adapts to the new window dimensions.
 */
function windowResized() {
  resizeCanvas(windowWidth, windowHeight); // Adjust canvas size to fill the new window dimensions.
  initializeArtwork(); // Re-initialize the artwork to adapt wheel placement to the new canvas size.
}
