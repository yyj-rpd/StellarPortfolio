import type { Education, Experience } from '../../types/content';

type Props = { kind: 'education'; items: Education[]; onChange: (items: Education[]) => void }
  | { kind: 'experience'; items: Experience[]; onChange: (items: Experience[]) => void };
export default function HistoryEditor(props: Props) {
  const label = props.kind === 'education' ? '教育经历' : '个人经历';
  function update(index: number, field: string, value: string) {
    if (props.kind === 'education') props.onChange(props.items.map((item, i) => i === index ? { ...item, [field]: value || (field === 'start' || field === 'end' ? null : '') } : item));
    else props.onChange(props.items.map((item, i) => i === index ? { ...item, [field]: value || (field === 'start' || field === 'end' ? null : '') } : item));
  }
  return <fieldset className="history-editor"><legend>{label}</legend>
    <p className="field-hint">未知日期留空。最多 20 项。</p>
    {props.items.map((item, index) => <fieldset className="history-item" key={index}>
      <legend>{label} {index + 1}</legend>
      {'school' in item ? <>
        <label>学校<input required maxLength={160} value={item.school} onChange={event => update(index, 'school', event.target.value)} /></label>
        <label>专业 / 学位<input required maxLength={160} value={item.degree} onChange={event => update(index, 'degree', event.target.value)} /></label>
      </> : <>
        <label>机构<input required maxLength={160} value={item.organization} onChange={event => update(index, 'organization', event.target.value)} /></label>
        <label>角色<input required maxLength={160} value={item.role} onChange={event => update(index, 'role', event.target.value)} /></label>
      </>}
      <div className="admin-field-pair"><label>开始时间<input type="month" value={item.start ?? ''} onChange={event => update(index, 'start', event.target.value)} /></label>
        <label>结束时间<input type="month" value={item.end ?? ''} onChange={event => update(index, 'end', event.target.value)} /></label></div>
      <label>经历说明<textarea maxLength={1000} value={item.description} onChange={event => update(index, 'description', event.target.value)} /></label>
      <button className="button" type="button" onClick={() => {
        if (props.kind === 'education') props.onChange(props.items.filter((_, i) => i !== index));
        else props.onChange(props.items.filter((_, i) => i !== index));
      }}>移除该条经历</button>
    </fieldset>)}
    <button className="button" type="button" disabled={props.items.length >= 20} onClick={() => {
      if (props.kind === 'education') props.onChange([...props.items, { school: '', degree: '', start: null, end: null, description: '' }]);
      else props.onChange([...props.items, { organization: '', role: '', start: null, end: null, description: '' }]);
    }}>添加{label}</button>
  </fieldset>;
}


