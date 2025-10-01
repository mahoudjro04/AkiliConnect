declare module "*.css" {
  const content: { [className: string]: string }
  export default content
}

declare module "@/app/globals.css" {
  const content: string
  export default content
}
