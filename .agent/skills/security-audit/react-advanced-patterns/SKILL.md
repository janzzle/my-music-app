---
name: react-advanced-patterns
description: React 및 React Native(Expo) 코드를 작성/수정할 때 Vercel 표준의 고급 컴포넌트 합성 패턴과 리렌더링(Re-rendering) 방지 원칙을 적용합니다. 상태가 복잡한 컴포넌트나 재사용 가능한 UI를 만들 때 사용하세요.
---
# React 고급 설계 및 패턴 스킬 (React Advanced Patterns Skill)

컴포넌트의 상태(State)와 아키텍처를 설계할 때 반드시 아래의 모범 사례를 적용하세요:

## 🧱 컴포넌트 합성 및 구조 (Composition Patterns)
1. **Boolean Props 남용 방지**: `<Button isPrimary isLarge />` 같은 다중 Boolean 방식 대신, 명시적인 Variant 조합(`<Button variant="primary" size="lg" />`)을 사용하세요.
2. **Children Prop 활용**: 부모 컴포넌트가 너무 많은 속성(Props)을 받아 밑으로 내려주는 것(Props Drilling)을 피하고, `children`이나 제어 역전(Inversion of Control) 패턴을 사용하여 컴포넌트를 분리하세요.

## ⚡ 렌더링 최적화 및 상태 관리 (Rendering & State)
3. **파생 상태 (Derived State) 우선**: `useEffect`를 사용하여 상태A가 바뀔 때 상태B를 억지로 동기화(SetState)하는 안티 패턴을 절대 금지합니다. 렌더링 중에 곧바로 계산할 수 있는 값은 단순 변수로 처리하세요.
4. **의존성 배열 엄격성**: `useMemo`, `useCallback`, `useEffect` 작성 시 내부에서 사용된 모든 반응형 값은 반드시 의존성 배열(Dependency Array)에 포함시켜야 합니다.
5. **상태 끌어올리기 (Lifting State Up)**: 여러 컴포넌트가 동일한 변경 데이터를 공유해야 할 때만 상태를 상위 부모로 끌어올리고, 그렇지 않으면 상태를 최대한 사용하는 곳 가까이(Local) 배치하세요.

## 📝 리포트 제공 방법
- 코드를 생성/수정한 후, 어떤 고급 패턴(예: 파생 상태 적용, Variant 사용 등)을 적용하여 성능을 이끌어 냈는지 짧게 코멘트하세요.