function SignOutButton({ onClick }) {
  return (
    <button
      type="button"
      className="secondary-button icon-button"
      onClick={onClick}
      aria-label="Sign out"
      title="Sign out"
    >
      <svg
        className="button-icon"
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
      >
        <path d="M10 17v2H5V5h5v2H7v10h3Z" />
        <path d="M14.6 16.4 13.2 15l2-2H9v-2h6.2l-2-2 1.4-1.4L19 12Z" />
      </svg>
    </button>
  )
}

export default SignOutButton
