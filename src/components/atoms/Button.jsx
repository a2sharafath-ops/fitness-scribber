import Icon from './Icon'

export default function Button({ variant = 'primary', size, icon, className = '', children, ...rest }) {
  const cls = ['btn']
  if (variant === 'ghost') cls.push('ghost')
  if (variant === 'danger') cls.push('danger')
  if (size === 'sm') cls.push('sm')
  if (className) cls.push(className)
  return (
    <button type="button" className={cls.join(' ')} {...rest}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  )
}
