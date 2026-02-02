# Example: Using Ralph Wiggum with Copilot CLI

This example demonstrates how to use the Ralph Wiggum agent with GitHub Copilot CLI to build a simple web application.

## Scenario

You want to build a simple todo application with a web interface.

## Step 1: Prepare Your Prompt

Edit `PROMPT.md`:

```markdown
# Build a Todo Application

## Task Description
Create a simple todo application with a web interface.

## Requirements
- Single HTML file with embedded CSS and JavaScript
- Add, delete, and mark todos as complete
- Persistent storage using localStorage
- Clean, modern UI design
- Responsive layout

## Constraints
- Keep everything in one HTML file for simplicity
- Use vanilla JavaScript (no frameworks)
- Make it visually appealing with good UX
- Add smooth animations for interactions

## Current State
- [ ] Create HTML structure
- [ ] Add CSS styling
- [ ] Implement JavaScript logic
- [ ] Add localStorage persistence
- [ ] Test all features

## Notes for Ralph
- Focus on clean, maintainable code
- Use semantic HTML
- Include helpful comments
- Test in the browser after completion
```

## Step 2: Start Ralph with Copilot CLI

### Option A: Interactive Mode

```bash
# Navigate to your project
cd "C:\Users\COLLINSE\Desktop\Personal Projects\ralphster"

# Start Copilot CLI
copilot

# When prompted, type:
/agent
# Select "ralph-wiggum" from the list

# Then give Ralph the instruction:
Read PROMPT.md and start working on the todo application
```

### Option B: Direct Command

```bash
copilot --agent=ralph-wiggum --prompt "Read PROMPT.md and start building the todo application"
```

### Option C: Let Copilot Infer

```bash
copilot

# At the prompt:
Use the ralph-wiggum agent to build the todo app described in PROMPT.md
```

## Step 3: What Ralph Will Do

Ralph will:

1. **Read the prompt**: Parse PROMPT.md to understand requirements
2. **Create a plan**: Break down the task into steps
3. **Start coding**: Create the HTML file with structure
4. **Iterate**: Add CSS, JavaScript, and localStorage
5. **Test**: Verify the functionality works
6. **Report**: Update you on progress

### Expected Output

```
🍩 Ralph Wiggum starting work...

I'll read PROMPT.md to understand what we're building...

Task identified: Build a todo application
Requirements: Single HTML file, localStorage, modern UI

Let me start by creating the HTML structure...

[Ralph creates todo.html]

✅ Created basic HTML structure
Next: Adding CSS styling for modern appearance...

[Ralph adds CSS]

✅ Styled the application
Next: Implementing JavaScript logic...

[Ralph adds JavaScript]

✅ Added todo functionality
Next: Implementing localStorage persistence...

[Ralph adds persistence]

✅ Todo app complete!

Summary:
- Created responsive todo application
- Implemented add, delete, and complete features
- Added localStorage for persistence
- Included smooth animations

You can open todo.html in your browser to test it!
```

## Step 4: Interact with Ralph

### Provide Feedback

If Ralph's solution needs adjustments:

```bash
# In the Copilot CLI prompt
Make the UI more colorful and add icons for the buttons
```

Ralph will update the code based on your feedback.

### Check Progress

```bash
# Ask Ralph about current state
What's the status of the todo app?

# Or ask for specific details
Show me how localStorage is implemented
```

### Continue Working

```bash
# Ralph can continue with enhancements
Add a feature to filter todos by status (all, active, completed)
```

## Step 5: Advanced Usage

### Use Plan Mode

Before Ralph starts coding, enter plan mode:

1. Press `Shift+Tab` to toggle plan mode
2. Ralph creates a detailed implementation plan
3. Review the plan and approve
4. Ralph executes the plan step-by-step

### Delegate Complex Work

For more complex features:

```bash
# Delegate to Copilot coding agent on GitHub
/delegate Add user authentication with Google OAuth and save todos per user
```

This pushes the work to GitHub's coding agent which can:
- Work across multiple files
- Create pull requests
- Run tests in the cloud

### Resume Later

```bash
# Stop work and come back later
/exit

# Later, resume where you left off
copilot --resume --agent=ralph-wiggum
```

## Step 6: Review Changes

Before committing, review what Ralph did:

```bash
# In Copilot CLI
/review

# Or use the review command
copilot review
```

Ralph will show you:
- What files were changed
- What was added/removed
- Potential issues or improvements

## Tips for Success

### 1. Update PROMPT.md Frequently

As Ralph works, update the checklist:

```markdown
## Current State
- [x] Create HTML structure ✅
- [x] Add CSS styling ✅
- [x] Implement JavaScript logic ✅
- [x] Add localStorage persistence ✅
- [ ] Add filtering feature
- [ ] Add keyboard shortcuts
```

### 2. Add Specific Constraints

If Ralph does something you don't like, add a constraint:

```markdown
## Constraints
- Use CSS Grid for layout (not Flexbox)
- Limit color palette to blues and whites
- Keep JavaScript under 200 lines
- No external dependencies
```

### 3. Give Context About Existing Code

```bash
# Reference specific files
The todo app in @test_files/index.html needs improvement. Add dark mode support.

# Or reference multiple files
Compare @test_files/index.html and @test_files/script.js and consolidate them
```

### 4. Combine with Local Ralph

Use both methods together:

```bash
# Use local Ralph for quick iterations (offline)
.\ralph.ps1 -MaxIterations 3

# Use Copilot CLI Ralph for complex features (cloud)
copilot --agent=ralph-wiggum --prompt "Add advanced filtering and sorting"
```

## Example Session Transcript

```
> copilot --agent=ralph-wiggum

🍩 Ralph Wiggum agent activated

> Read PROMPT.md and build the todo application

🍩 Reading PROMPT.md...

I understand! I need to build a todo application with:
- Single HTML file
- Add, delete, complete functionality
- localStorage persistence
- Modern, responsive UI

Let me start by creating the HTML structure...

[Creating todo.html...]

✅ HTML structure created

Now adding CSS styling for a modern look...

[Adding CSS...]

✅ Styling complete

Implementing JavaScript for todo functionality...

[Adding JavaScript...]

✅ Core functionality added

Adding localStorage persistence...

[Updating JavaScript...]

✅ Persistence implemented

Let me test the application...

✅ All features working!

Summary:
- ✅ Created responsive layout
- ✅ Implemented add/delete/complete
- ✅ Added localStorage
- ✅ Smooth animations included

The todo app is ready! Open todo.html in your browser.

> Great! Now add a dark mode toggle

🍩 Adding dark mode...

I'll add:
1. Toggle button in the header
2. Dark mode CSS variables
3. localStorage to remember preference

[Updating todo.html...]

✅ Dark mode added!

- Toggle button in top right
- Remembers user preference
- Smooth transition between modes

Try clicking the 🌙 button!

> Perfect! Can you add keyboard shortcuts?

🍩 Adding keyboard shortcuts...

I'll implement:
- Enter: Add new todo (when in input)
- Escape: Clear input
- Delete: Remove selected todo
- Space: Toggle todo completion

[Updating JavaScript...]

✅ Keyboard shortcuts implemented!

The app now supports:
- Enter: Add todo
- Esc: Clear input
- Ctrl+D: Delete last todo
- Space: Toggle last todo

All done! 🍩

> Thanks Ralph!

🍩 Me make good code! That's unpossible to fail!

You're welcome! Let me know if you need anything else.
```

## What Makes Ralph Different?

### Traditional Coding Assistant
```
You: "Build a todo app"
Assistant: "Here's the code: [dumps 300 lines]"
You: "Cool... now what?"
```

### Ralph Wiggum Agent
```
You: "Read PROMPT.md and start"
Ralph: "I'll work on the HTML first..."
Ralph: "Now adding CSS..."
Ralph: "Testing localStorage..."
Ralph: "Done! Next, I'll add dark mode..."
```

Ralph works **iteratively** and **explains** each step, making the development process transparent and collaborative.

## Troubleshooting

### Ralph doesn't see PROMPT.md

```bash
# Make sure you're in the right directory
pwd

# Create PROMPT.md if missing
copilot --agent=ralph-wiggum --prompt "Create a PROMPT.md file with instructions for building a todo app"
```

### Ralph makes unwanted changes

Update PROMPT.md with constraints:

```markdown
## Constraints
- DO NOT modify existing files in test_files/
- Only create new files in the current directory
- Ask before installing dependencies
```

### Ralph gets stuck

```bash
# Stop current operation
Press Esc

# Give Ralph more specific guidance
Please try a different approach: use a simpler implementation without dependencies
```

## Next Steps

After completing this example:

1. Try building something more complex
2. Experiment with different prompts
3. Use Ralph for real projects
4. Share your Ralph agent with your team

---

🍩 **Ralph says**: "I'm a code maker!" - Happy building!
