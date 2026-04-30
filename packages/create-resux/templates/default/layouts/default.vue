<template>
  <div class="shell">
    <header class="nav">
      <ResuxLink to="/">%PROJECT_TITLE%</ResuxLink>
      <nav>
        <ResuxLink to="/">Home</ResuxLink>
        <ResuxLink to="/about">About</ResuxLink>
      </nav>
    </header>
    <slot />
  </div>
</template>
