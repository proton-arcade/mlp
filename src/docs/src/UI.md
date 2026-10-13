---
title: UI
description: Create a rich UI and interactions in the Mixt OS desktop environment.
---

The UI API provides a comprehensive set of tools for creating rich user interfaces and interacting with the Mixt OS desktop environment. It includes window management, dialogs, and desktop integration features.

## Available Functions

### Authentication
- **[`mixt.ui.authenticateWithMixt()`](/UI/authenticateWithMixt/)** - Authenticate with Mixt OS

### Dialogs and Alerts
- **[`mixt.ui.alert()`](/UI/alert/)** - Show alert dialogs
- **[`mixt.ui.notify()`](/UI/notify/)** - Show desktop notifications
- **[`mixt.ui.prompt()`](/UI/prompt/)** - Show input prompts
- **[`mixt.ui.showFeedbackDialog()`](/UI/showFeedbackDialog/)** - Let the user send feedback to your app's developer

### Window Management
- **[`mixt.ui.createWindow()`](/UI/createWindow/)** - Create new windows
- **[`mixt.ui.setWindowTitle()`](/UI/setWindowTitle/)** - Set window title
- **[`mixt.ui.setWindowSize()`](/UI/setWindowSize/)** - Set window dimensions
- **[`mixt.ui.setWindowPosition()`](/UI/setWindowPosition/)** - Set window position
- **[`mixt.ui.setWindowWidth()`](/UI/setWindowWidth/)** - Set window width
- **[`mixt.ui.setWindowHeight()`](/UI/setWindowHeight/)** - Set window height
- **[`mixt.ui.setWindowX()`](/UI/setWindowX/)** - Set window X position
- **[`mixt.ui.setWindowY()`](/UI/setWindowY/)** - Set window Y position
- **[`mixt.ui.showWindow()`](/UI/showWindow/)** - Show the application's window
- **[`mixt.ui.hideWindow()`](/UI/hideWindow/)** - Hide the application's window

### File Pickers
- **[`mixt.ui.showOpenFilePicker()`](/UI/showOpenFilePicker/)** - Show file open dialog
- **[`mixt.ui.showSaveFilePicker()`](/UI/showSaveFilePicker/)** - Show file save dialog
- **[`mixt.ui.showDirectoryPicker()`](/UI/showDirectoryPicker/)** - Show directory picker

### System Integration
- **[`mixt.ui.launchApp()`](/UI/launchApp/)** - Launch other applications
- **[`mixt.ui.parentApp()`](/UI/parentApp/)** - Get parent application info
- **[`mixt.exit()`](/UI/exit/)** - Exit the application
- **[`mixt.ui.setMenubar()`](/UI/setMenubar/)** - Set application menubar
- **[`mixt.ui.getLanguage()`](/UI/getLanguage/)** - Get current language/locale code

### Event Handling
- **[`mixt.ui.on()`](/UI/on/)** - Register event handlers
- **[`mixt.ui.onItemsOpened()`](/UI/onItemsOpened/)** - Handle items opened by user action
- **[`mixt.ui.onLaunchedWithItems()`](/UI/onLaunchedWithItems/)** - Handle launch with items
- **[`mixt.ui.wasLaunchedWithItems()`](/UI/wasLaunchedWithItems/)** - Check if launched with items
- **[`mixt.ui.onWindowClose()`](/UI/onWindowClose/)** - Handle window close events

### Additional UI Elements
- **[`mixt.ui.contextMenu()`](/UI/contextMenu/)** - Show a context menu at the cursor
- **[`mixt.ui.hideSpinner()`](/UI/hideSpinner/)** - Hide spinner
- **[`mixt.ui.requestPictureInPicture()`](/UI/requestPictureInPicture/)** - Float a page of the app in a picture-in-picture window
- **[`mixt.ui.exitPictureInPicture()`](/UI/exitPictureInPicture/)** - Close the app's picture-in-picture window
- **[`mixt.ui.showColorPicker()`](/UI/showColorPicker/)** - Show color picker
- **[`mixt.ui.showFontPicker()`](/UI/showFontPicker/)** - Show font picker
- **[`mixt.ui.showSpinner()`](/UI/showSpinner/)** - Show spinner
- **[`mixt.ui.socialShare()`](/UI/socialShare/)** - Share content socially
