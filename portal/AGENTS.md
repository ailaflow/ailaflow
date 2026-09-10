# AilaFlow Portal

This React project is split into two main parts:

- `/src/views` — Views are reusable React components that contain HTML structure and Tailwind classes. Views cannot contain any business logic, API calls, or complex state management. Views are dumb components that only receive data via props and render it.
- `/src/routes` — Routes are the main entry point for each page in the portal. They are responsible for fetching data, handling user interactions, and rendering the appropriate views. Routes can contain business logic, API calls, and state management. Routes should NOT contain any HTML structure or Tailwind classes. They should only render views and pass data to them via props.

This project must work seamlessly across desktop browsers and mobile devices. All views should be fully responsive and use Tailwind CSS responsive utilities to ensure a polished, consistent layout on every screen size.
