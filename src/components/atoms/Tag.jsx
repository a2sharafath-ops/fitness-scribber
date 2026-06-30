export default function Tag({ color = 'gray', children, ...rest }) {
  return (
    <span className={'tag ' + color} {...rest}>
      {children}
    </span>
  )
}
