


 <script>
    const contactLink = document.getElementById("contact-link");
    if (contactLink) {
      const parts = ["pintsofbangkok", "gmail", "com"];
      const email = parts[0] + "@" + parts[1] + "." + parts[2];

      contactLink.href = `mailto:${email}?subject=Guinness Bangkok Update`;
    }
  </script>
