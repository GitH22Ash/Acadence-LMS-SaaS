const CompanionSession = () => {
  return (
    <div>CompanionSession</div>
  )
}

export default CompanionSession



//for dynamic routing of individual companion sessions based on their IDs we use the [id] folder
//this file is app/companions/[id]/page.tsx
//the [id] in the path indicates that this is a dynamic route and the id can be any value
//we can access the id value using the useRouter hook from next/router
//we can then use this id to fetch the companion session data from the backend and display it on this page
//the naming convention of using square brackets for dynamic routes is a feature of Next.js
//more about dynamic routing in Next.js can be found here: https://nextjs.org/docs/routing/dynamic-routes